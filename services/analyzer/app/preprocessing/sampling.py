from __future__ import annotations

import cv2
import numpy as np


def downsample(image: np.ndarray, factor: int = 2) -> np.ndarray:
    """
    Muestreo / decimación 2D (DSP): reduce resolución conservando estructura espacial.
    factor=2 → ~1/4 de los píxeles.
    """
    factor = max(1, int(factor))
    if factor == 1:
        return image
    h, w = image.shape[:2]
    new_w = max(1, w // factor)
    new_h = max(1, h // factor)
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
