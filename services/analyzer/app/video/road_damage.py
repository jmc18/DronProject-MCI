"""Segmentación y porcentaje de daño, tomado de road_damage_assessment_app.py.

Sin cv2.imshow ni rutas fijas: el job de vídeo llama a assess_frame por fotograma.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

import cv2
import numpy as np

DAMAGE_WINDOW = 20


@dataclass
class FrameDamage:
    annotated_bgr: np.ndarray
    percentage: float
    smoothed_percentage: float
    mask_count: int
    boxes: list[dict]


@dataclass
class DamageSummary:
    mean_damage_percent: float
    max_damage_percent: float
    frames_with_damage: int
    total_masks: int
    percentages: list[float] = field(default_factory=list)


class DamageTracker:
    """Media móvil de 20 muestras, igual que el script de Farzad."""

    def __init__(self) -> None:
        self._window: deque[float] = deque(maxlen=DAMAGE_WINDOW)
        self.percentages: list[float] = []
        self.frames_with_damage = 0
        self.total_masks = 0

    def assess(
        self,
        model,
        frame_bgr: np.ndarray,
        imgsz: int,
        conf: float,
    ) -> FrameDamage:
        if model is None:
            smoothed = self._push(0.0)
            return FrameDamage(frame_bgr.copy(), 0.0, smoothed, 0, [])

        results = model.predict(source=frame_bgr, imgsz=imgsz, conf=conf, verbose=False)
        result = results[0]
        annotated = result.plot(boxes=False)
        percentage, mask_count = _damage_percent(result, frame_bgr.shape)
        boxes = _boxes(result)
        smoothed = self._push(percentage)
        self.total_masks += mask_count
        if mask_count > 0:
            self.frames_with_damage += 1
        _draw_damage_label(annotated, smoothed)
        return FrameDamage(annotated, percentage, smoothed, mask_count, boxes)

    def summary(self) -> DamageSummary:
        values = self.percentages or [0.0]
        return DamageSummary(
            mean_damage_percent=sum(values) / len(values),
            max_damage_percent=max(values),
            frames_with_damage=self.frames_with_damage,
            total_masks=self.total_masks,
            percentages=list(self.percentages),
        )

    def _push(self, percentage: float) -> float:
        self._window.append(percentage)
        smoothed = sum(self._window) / len(self._window)
        self.percentages.append(smoothed)
        return smoothed


def _damage_percent(result, shape: tuple[int, ...]) -> tuple[float, int]:
    masks = getattr(result, "masks", None)
    if masks is None or getattr(masks, "data", None) is None:
        return 0.0, 0
    frame_h, frame_w = int(shape[0]), int(shape[1])
    image_area = frame_h * frame_w
    if image_area <= 0:
        return 0.0, 0
    raw = masks.data.cpu().numpy()
    total_area = 0.0
    count = 0
    for mask in raw:
        binary = (mask > 0).astype(np.uint8) * 255
        if binary.shape[:2] != (frame_h, frame_w):
            binary = cv2.resize(binary, (frame_w, frame_h), interpolation=cv2.INTER_NEAREST)
        contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        total_area += cv2.contourArea(max(contours, key=cv2.contourArea))
        count += 1
    if count == 0:
        return 0.0, 0
    return (total_area / image_area) * 100.0, count


def _boxes(result) -> list[dict]:
    boxes = getattr(result, "boxes", None)
    if boxes is None or boxes.xyxy is None:
        return []
    xyxy = boxes.xyxy.cpu().numpy()
    confs = boxes.conf.cpu().numpy() if boxes.conf is not None else []
    out: list[dict] = []
    for i, box in enumerate(xyxy):
        x1, y1, x2, y2 = [float(v) for v in box]
        conf = float(confs[i]) if i < len(confs) else None
        out.append(
            {
                "confidence": conf,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "area_px": float((x2 - x1) * (y2 - y1)),
            }
        )
    return out


def _draw_damage_label(frame: np.ndarray, smoothed: float) -> None:
    text = f"Road Damage: {smoothed:.2f}%"
    origin = (40, 80)
    cv2.line(frame, (origin[0], origin[1] - 10), (origin[0] + 460, origin[1] - 10), (0, 0, 255), 40)
    cv2.putText(
        frame,
        text,
        origin,
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2,
        cv2.LINE_AA,
    )
