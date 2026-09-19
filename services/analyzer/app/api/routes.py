from __future__ import annotations

import cv2
import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings
from app.ml.yolo_segmenter import YoloPotholeSegmenter
from app.preprocessing.pipeline import run_preprocess_pipeline

router = APIRouter()
_segmenter: YoloPotholeSegmenter | None = None


def get_segmenter() -> YoloPotholeSegmenter:
    global _segmenter
    if _segmenter is None:
        _segmenter = YoloPotholeSegmenter(settings.yolo_weights_path)
    return _segmenter


@router.get("/health")
def health() -> dict:
    seg = get_segmenter()
    return {
        "ok": True,
        "service": "analyzer",
        "yolo_loaded": seg.model is not None,
        "warning": seg.warning,
    }


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict:
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
    }
