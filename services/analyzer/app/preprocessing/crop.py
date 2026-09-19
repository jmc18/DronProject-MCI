from __future__ import annotations

import numpy as np


def crop_roi(image: np.ndarray, margin_ratio: float = 0.1) -> np.ndarray:
    """
    CROP centrado: delimita una región de interés reduciendo márgenes.
    Útil para comparar técnicas de PDI sobre el área vial central.
    """
    margin_ratio = min(max(float(margin_ratio), 0.0), 0.45)
    h, w = image.shape[:2]
    top = int(h * margin_ratio)
    left = int(w * margin_ratio)
    bottom = h - top
    right = w - left
    if bottom <= top or right <= left:
        return image
    return image[top:bottom, left:right]
