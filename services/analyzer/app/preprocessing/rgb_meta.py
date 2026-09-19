from __future__ import annotations

import cv2
import numpy as np


def analyze_rgb(image_bgr: np.ndarray) -> dict:
    """Analiza resolución, canales y estadísticas del modelo de color RGB."""
    h, w = image_bgr.shape[:2]
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    means = rgb.mean(axis=(0, 1))
    stds = rgb.std(axis=(0, 1))
    return {
        "width": int(w),
        "height": int(h),
        "channels": int(image_bgr.shape[2]) if image_bgr.ndim == 3 else 1,
        "dtype": str(image_bgr.dtype),
        "rgb_mean": [float(x) for x in means],
        "rgb_std": [float(x) for x in stds],
        "pixels": int(h * w),
    }
