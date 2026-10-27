from __future__ import annotations

import logging
import threading
from typing import Any

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.core.auth import require_internal_token
from app.core.config import settings
from app.ml.yolo_segmenter import YoloPotholeSegmenter
from app.preprocessing.pipeline import run_preprocess_pipeline
from app.video.ffprobe import FfprobeError
from app.video.pipeline import VideoJobPipeline, detect_device

logger = logging.getLogger(__name__)

router = APIRouter()
_segmenter: YoloPotholeSegmenter | None = None
_jobs_lock = threading.Lock()
_running_jobs: set[str] = set()


def get_segmenter() -> YoloPotholeSegmenter:
    global _segmenter
    if _segmenter is None:
        _segmenter = YoloPotholeSegmenter(settings.yolo_weights_path)
    return _segmenter


class JobRequest(BaseModel):
    jobId: str = Field(..., min_length=1)
    path: str = Field(..., min_length=1)
    model: str = "pothole_seg"


def _post_progress(job_id: str, payload: dict[str, Any]) -> None:
    url = f"{settings.web_internal_url.rstrip('/')}/api/internal/jobs/{job_id}/progress"
    headers = {"x-internal-token": settings.internal_token}
    try:
        httpx.post(url, json=payload, headers=headers, timeout=30.0)
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo reportar progreso de %s: %s", job_id, exc)


def _run_job(req: JobRequest) -> None:
    try:
        pipeline = VideoJobPipeline(get_segmenter())
        pipeline.run(
            job_id=req.jobId,
            video_path=req.path,
            model=req.model,
            on_progress=lambda p: _post_progress(req.jobId, p),
        )
    except FfprobeError as exc:
        _post_progress(
            req.jobId,
            {"status": "FAILED", "progress": 0, "errorMessage": str(exc)},
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Job %s falló", req.jobId)
        _post_progress(
            req.jobId,
            {"status": "FAILED", "errorMessage": str(exc)},
        )
    finally:
        with _jobs_lock:
            _running_jobs.discard(req.jobId)


@router.get("/health")
def health() -> dict:
    seg = get_segmenter()
    device = detect_device()
    return {
        "ok": True,
        "service": "analyzer",
        "version": "0.2.0",
        "yolo_loaded": seg.model is not None,
        "model": settings.yolo_weights_path,
        "device": device,
        "warning": seg.warning,
        "running_jobs": len(_running_jobs),
    }


@router.post("/internal/jobs", dependencies=[Depends(require_internal_token)])
def enqueue_job(req: JobRequest) -> dict:
    with _jobs_lock:
        if req.jobId in _running_jobs:
            return {"ok": True, "message": "already_running", "jobId": req.jobId}
        _running_jobs.add(req.jobId)

    thread = threading.Thread(target=_run_job, args=(req,), daemon=True)
    thread.start()
    return {"ok": True, "jobId": req.jobId, "status": "QUEUED"}


@router.post("/analyze", dependencies=[Depends(require_internal_token)])
async def analyze(file: UploadFile = File(...)) -> dict:
    """
    DEPRECATED: análisis de imagen still. Preferir /internal/jobs con vídeo.
    Protegido con INTERNAL_TOKEN.
    """
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    arr = np.frombuffer(raw, dtype=np.uint8)
    image_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image_bgr is None:
        raise HTTPException(status_code=400, detail="No se pudo decodificar la imagen")

    pipeline = run_preprocess_pipeline(image_bgr)
    segmenter = get_segmenter()
    detections = segmenter.predict(pipeline.working_bgr)

    return {
        "ok": True,
        "warning": segmenter.warning,
        "image_meta": pipeline.image_meta,
        "preprocess": pipeline.preprocess,
        "detections": detections,
        "deprecated": True,
    }
