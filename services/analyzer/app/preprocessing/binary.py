from __future__ import annotations

import cv2
import numpy as np


def to_binary(image_gray: np.ndarray, threshold: int = 110) -> np.ndarray:
    """Genera imagen binaria por umbral fijo (regiones de interés)."""
    _, binary = cv2.threshold(image_gray, int(threshold), 255, cv2.THRESH_BINARY)
    return binary
