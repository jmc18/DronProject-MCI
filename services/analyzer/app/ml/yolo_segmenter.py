from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


class YoloPotholeSegmenter:
    """
    Carga pesos YOLOv8-seg de baches si existen.
    Sin pesos, opera en modo stub (detecciones vacías) para VPS sin modelo.
    """

    def __init__(self, weights_path: str) -> None:
        self.weights_path = weights_path
        self.model = None
        self.warning: str | None = None
        self._load()

    def _load(self) -> None:
        path = Path(self.weights_path)
        if not path.is_file():
            self.warning = (
                f"Pesos no encontrados en {self.weights_path}. "
                "Modo stub activo (sin segmentación real)."
            )
            logger.warning(self.warning)
            return

        try:
            from ultralytics import YOLO

            self.model = YOLO(str(path))
            logger.info("Modelo YOLOv8 cargado desde %s", path)
        except Exception as exc:  # noqa: BLE001
            self.warning = f"No se pudo cargar YOLO: {exc}"
            logger.exception(self.warning)
            self.model = None

    def predict(self, image_bgr: np.ndarray) -> list[dict[str, Any]]:
        if self.model is None:
            return []

        results = self.model.predict(source=image_bgr, verbose=False)
        detections: list[dict[str, Any]] = []

        for result in results:
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                continue
            xyxy = boxes.xyxy.cpu().numpy() if boxes.xyxy is not None else []
            confs = boxes.conf.cpu().numpy() if boxes.conf is not None else []
            for i, box in enumerate(xyxy):
                x1, y1, x2, y2 = [float(v) for v in box]
                conf = float(confs[i]) if i < len(confs) else None
                detections.append(
                    {
                        "confidence": conf,
                        "bbox": [x1, y1, x2 - x1, y2 - y1],
                        "area_px": float((x2 - x1) * (y2 - y1)),
                        "mask_path": None,
                    }
                )

        return detections
