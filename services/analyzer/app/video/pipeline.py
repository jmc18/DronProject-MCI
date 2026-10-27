from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Callable

import cv2
import numpy as np

from app.core.config import settings
from app.ml.yolo_segmenter import YoloPotholeSegmenter
from app.video.ffprobe import FfprobeError, VideoMeta, find_tool, probe_video
from app.video.road_damage import DamageTracker
from app.video.tiling import Detection, iter_tiles, nms_merge

logger = logging.getLogger(__name__)

ProgressCb = Callable[[dict[str, Any]], None]


def detect_device() -> str:
    try:
        import torch

        if torch.cuda.is_available():
            return f"cuda:{torch.cuda.get_device_name(0)}"
    except Exception:
        pass
    return "cpu"


class VideoJobPipeline:
    def __init__(self, segmenter: YoloPotholeSegmenter) -> None:
        self.segmenter = segmenter

    def run(
        self,
        job_id: str,
        video_path: str,
        model: str,
        on_progress: ProgressCb | None = None,
        timeout_minutes: int | None = None,
    ) -> dict[str, Any]:
        start = time.time()
        timeout_s = (timeout_minutes or settings.job_timeout_minutes) * 60
        job_dir = Path(video_path).parent
        tmp_root = Path(settings.worker_tmp_dir) / job_id
        tmp_root.mkdir(parents=True, exist_ok=True)

        def report(payload: dict[str, Any]) -> None:
            if on_progress:
                try:
                    on_progress(payload)
                except Exception as exc:
                    logger.warning("progress callback failed: %s", exc)

        try:
            report({"status": "VALIDATING", "progress": 0})
            try:
                meta = probe_video(video_path)
            except FfprobeError as exc:
                report(
                    {
                        "status": "FAILED",
                        "progress": 0,
                        "errorMessage": str(exc),
                    }
                )
                raise

            meta_path = job_dir / "meta.json"
            meta_path.write_text(json.dumps(meta.to_dict(), indent=2), encoding="utf-8")
            report(
                {
                    "status": "PROCESSING",
                    "progress": 2,
                    "meta": meta.to_dict(),
                    "warning": meta.warning,
                }
            )

            device = detect_device()
            if device == "cpu":
                est_min = max(1, int(meta.duration_sec * meta.fps / max(settings.frame_stride, 1) / 2))
                logger.warning(
                    "CUDA no disponible — procesamiento en CPU. ETA aproximada %s min para job %s",
                    est_min,
                    job_id,
                )

            # preview (navegador)
            preview_path = job_dir / "preview.mp4"
            self._transcode_preview(video_path, str(preview_path), max_height=1080)

            stride = self._resolve_stride(meta)
            frames = self._iter_sampled_frames(video_path, meta, stride)
            frame_records: list[dict[str, Any]] = []
            tracker = DamageTracker()
            last_progress_t = 0.0
            processed = 0
            expected = max(1, int(meta.duration_sec * meta.fps / stride) if meta.fps else 1)
            scale = settings.processed_max_height / meta.height if meta.height > settings.processed_max_height else 1.0
            out_w = max(2, int(meta.width * scale) // 2 * 2)
            out_h = max(2, int(meta.height * scale) // 2 * 2)
            processed_path = job_dir / "processed.mp4"
            writer, tmp_avi = self._open_annotated_writer(meta, stride, out_w, out_h)

            try:
                for frame_idx, frame_bgr in frames:
                    if time.time() - start > timeout_s:
                        msg = f"Timeout de job ({timeout_s // 60} min)"
                        report({"status": "FAILED", "progress": processed / expected * 100, "errorMessage": msg})
                        raise TimeoutError(msg)

                    assessed = tracker.assess(
                        self.segmenter.model,
                        frame_bgr,
                        imgsz=settings.imgsz,
                        conf=settings.confidence_threshold,
                    )
                    if writer is not None:
                        resized = cv2.resize(assessed.annotated_bgr, (out_w, out_h))
                        writer.write(resized)
                    frame_records.append(
                        {
                            "frame": frame_idx,
                            "damagePercent": assessed.smoothed_percentage,
                            "maskCount": assessed.mask_count,
                            "detections": assessed.boxes,
                        }
                    )
                    processed += 1
                    now = time.time()
                    if now - last_progress_t >= settings.progress_interval_sec:
                        pct = min(95.0, (processed / expected) * 90.0 + 5.0)
                        report({"status": "PROCESSING", "progress": pct, "meta": meta.to_dict()})
                        last_progress_t = now
            finally:
                if writer is not None:
                    writer.release()

            if tmp_avi:
                self._remux_annotated(tmp_avi, str(processed_path))

            unique = self._track_unique(frame_records)
            damage = tracker.summary()
            total_detections = damage.total_masks
            total_potholes = unique

            report_stats = {
                "totalDetections": total_detections,
                "totalPotholes": total_potholes,
                "meanDamagePercent": round(damage.mean_damage_percent, 2),
                "maxDamagePercent": round(damage.max_damage_percent, 2),
                "framesWithDamage": damage.frames_with_damage,
                "totalMasks": damage.total_masks,
                "device": device,
            }
            report_data = {
                "jobId": job_id,
                "model": model,
                "device": device,
                "meta": meta.to_dict(),
                "totalDetections": total_detections,
                "totalPotholes": total_potholes,
                "meanDamagePercent": report_stats["meanDamagePercent"],
                "maxDamagePercent": report_stats["maxDamagePercent"],
                "framesWithDamage": damage.frames_with_damage,
                "totalMasks": damage.total_masks,
                "frameStride": stride,
                "framesAnalyzed": processed,
                "frames": frame_records,
                "criterion": (
                    "totalDetections = máscaras de segmentación; "
                    "totalPotholes = tracks únicos por IoU temporal; "
                    "meanDamagePercent = media del % de área dañada suavizado (ventana 20)"
                ),
            }
            (job_dir / "report.json").write_text(
                json.dumps(report_data, indent=2), encoding="utf-8"
            )

            report(
                {
                    "status": "COMPLETED",
                    "progress": 100,
                    "meta": {**meta.to_dict(), "report": report_stats},
                    "warning": meta.warning or self.segmenter.warning,
                    "errorMessage": None,
                }
            )
            return report_data
        finally:
            shutil.rmtree(tmp_root, ignore_errors=True)

    def _resolve_stride(self, meta: VideoMeta) -> int:
        if settings.target_analysis_fps > 0 and meta.fps > 0:
            return max(1, int(round(meta.fps / settings.target_analysis_fps)))
        return max(1, settings.frame_stride)

    def _iter_sampled_frames(self, path: str, meta: VideoMeta, stride: int):
        # Prefer OpenCV streaming; NVDEC via ffmpeg pipe if CUDA
        device = detect_device()
        if device.startswith("cuda") and find_tool("ffmpeg"):
            yield from self._ffmpeg_frame_pipe(path, meta, stride)
            return

        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            raise RuntimeError("No se pudo abrir el vídeo")
        idx = 0
        try:
            while True:
                ok, frame = cap.read()
                if not ok:
                    break
                if idx % stride == 0:
                    yield idx, frame
                idx += 1
        finally:
            cap.release()

    def _ffmpeg_frame_pipe(self, path: str, meta: VideoMeta, stride: int):
        # Decode with hwaccel when possible; output raw bgr24 at original size (sampled by select)
        fps = meta.fps or 30
        select = f"not(mod(n\\,{stride}))"
        ffmpeg = find_tool("ffmpeg")
        if not ffmpeg:
            raise RuntimeError("ffmpeg no está instalado")
        cmd = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-hwaccel",
            "cuda",
            "-i",
            path,
            "-vf",
            f"select='{select}'",
            "-vsync",
            "vfr",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "pipe:1",
        ]
        # Fallback sin hwaccel si falla
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False)
        assert proc.stdout is not None
        frame_size = meta.width * meta.height * 3
        idx = 0
        try:
            while True:
                buf = proc.stdout.read(frame_size)
                if not buf or len(buf) < frame_size:
                    break
                frame = np.frombuffer(buf, dtype=np.uint8).reshape((meta.height, meta.width, 3))
                yield idx * stride, frame
                idx += 1
        finally:
            proc.kill()
            proc.wait(timeout=5)

    def _detect_frame(self, frame_bgr: np.ndarray) -> list[Detection]:
        tiles = iter_tiles(
            frame_bgr,
            tile_size=settings.tile_size,
            overlap=settings.tile_overlap,
            roi=settings.roi,
        )
        dets: list[Detection] = []
        for tile in tiles:
            raw = self.segmenter.predict(tile.image, imgsz=settings.imgsz)
            for item in raw:
                conf = float(item.get("confidence") or 0)
                if conf < settings.confidence_threshold:
                    continue
                bbox = item.get("bbox") or [0, 0, 0, 0]
                # bbox relativo al tile → absoluto
                x, y, w, h = [float(v) for v in bbox]
                dets.append(
                    Detection(
                        confidence=conf,
                        bbox=(tile.x + x, tile.y + y, w, h),
                        area_px=float(item["area_px"]) if item.get("area_px") is not None else None,
                    )
                )
        return nms_merge(dets)

    def _track_unique(self, frame_records: list[dict[str, Any]]) -> int:
        """Deduplicación temporal greedy por IoU; intenta ByteTrack si el modelo Ultralytics lo permite."""
        try:
            # Si hay ultralytics tracker disponible en el futuro, se puede cablear aquí.
            pass
        except Exception:
            pass

        active: list[tuple[float, float, float, float]] = []  # last bbox
        unique = 0
        for fr in frame_records:
            used = [False] * len(active)
            for det in fr.get("detections") or []:
                bbox = tuple(det["bbox"])  # type: ignore[assignment]
                matched = False
                for i, ab in enumerate(active):
                    if used[i]:
                        continue
                    if _iou_box(bbox, ab) >= 0.3:
                        active[i] = bbox  # type: ignore[index]
                        used[i] = True
                        matched = True
                        break
                if not matched:
                    active.append(bbox)  # type: ignore[arg-type]
                    used.append(True)
                    unique += 1
            # Mantener tracks recientes (ventana); no podar solo por unmatched de un frame
            if len(active) > 500:
                active = active[-500:]
        return unique

    def _transcode_preview(self, src: str, dst: str, max_height: int) -> None:
        ffmpeg = find_tool("ffmpeg")
        if not ffmpeg:
            logger.warning("ffmpeg ausente — se omite preview")
            return
        cmd = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            src,
            "-vf",
            f"scale=-2:min({max_height}\\,ih)",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-an",
            dst,
        ]
        subprocess.run(cmd, check=False, shell=False)

    def _open_annotated_writer(
        self,
        meta: VideoMeta,
        stride: int,
        out_w: int,
        out_h: int,
    ) -> tuple[cv2.VideoWriter | None, str | None]:
        ffmpeg = find_tool("ffmpeg")
        if not ffmpeg:
            logger.warning("ffmpeg ausente — se omite processed.mp4")
            return None, None
        tmp_dir = tempfile.mkdtemp(prefix="vial-annot-")
        tmp_avi = os.path.join(tmp_dir, "out.avi")
        fps = max(1.0, (meta.fps or 1.0) / max(1, stride))
        writer = cv2.VideoWriter(tmp_avi, cv2.VideoWriter_fourcc(*"MJPG"), fps, (out_w, out_h))
        if not writer.isOpened():
            logger.warning("No se pudo abrir el writer de vídeo anotado")
            shutil.rmtree(tmp_dir, ignore_errors=True)
            return None, None
        return writer, tmp_avi

    def _remux_annotated(self, tmp_avi: str, dst: str) -> None:
        ffmpeg = find_tool("ffmpeg")
        if not ffmpeg:
            return
        cmd = [
            ffmpeg,
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            tmp_avi,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            dst,
        ]
        subprocess.run(cmd, check=False, shell=False)
        shutil.rmtree(os.path.dirname(tmp_avi), ignore_errors=True)


def _iou_box(a: tuple, b: tuple) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = aw * ah + bw * bh - inter
    return inter / union if union else 0.0
