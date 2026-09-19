from __future__ import annotations

import cv2
import numpy as np


def to_grayscale(image_bgr: np.ndarray) -> np.ndarray:
    """Conversión RGB/BGR → escala de grises."""
    if image_bgr.ndim == 2:
        return image_bgr
    return cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
