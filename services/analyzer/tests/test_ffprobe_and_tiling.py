"""Tests del worker sin depender de YOLO real ni vídeo 8K."""
from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import pytest

from app.video.ffprobe import FfprobeError, probe_video
from app.video.tiling import Detection, iter_tiles, nms_merge


def _have_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=False)
        return True
    except FileNotFoundError:
        return False


@pytest.mark.skipif(not _have_ffmpeg(), reason="ffmpeg/ffprobe no instalado")
def test_probe_tiny_mp4(tmp_path: Path) -> None:
    out = tmp_path / "tiny.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=black:s=320x240:d=1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ],
        check=True,
        capture_output=True,
    )
    meta = probe_video(str(out))
    assert meta.has_video
    assert meta.width == 320
    assert meta.height == 240
    assert meta.codec in {"h264", "hevc", "h265"}
    assert meta.warning  # no es 8K


def test_probe_corrupt(tmp_path: Path) -> None:
    bad = tmp_path / "bad.mp4"
    bad.write_bytes(b"not a video")
    with pytest.raises(FfprobeError):
        probe_video(str(bad))


def test_tiling_and_nms() -> None:
    frame = np.zeros((2000, 3000, 3), dtype=np.uint8)
    tiles = iter_tiles(frame, tile_size=1280, overlap=0.2)
    assert len(tiles) >= 4
    dets = [
        Detection(0.9, (10, 10, 50, 50)),
        Detection(0.8, (12, 12, 50, 50)),
        Detection(0.7, (500, 500, 40, 40)),
    ]
    merged = nms_merge(dets, iou_thresh=0.45)
    assert len(merged) == 2


def test_meta_json_roundtrip(tmp_path: Path) -> None:
    payload = {"width": 7680, "height": 4320, "codec": "hevc"}
    p = tmp_path / "meta.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    assert json.loads(p.read_text(encoding="utf-8"))["width"] == 7680
