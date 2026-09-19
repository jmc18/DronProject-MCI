from __future__ import annotations

import numpy as np


def quantize(image_gray: np.ndarray, levels: int = 8) -> np.ndarray:
    """Cuantización de intensidad a N niveles discretos."""
    levels = max(2, int(levels))
    step = 256 // levels
    q = (image_gray.astype(np.int32) // step) * step
    return np.clip(q, 0, 255).astype(np.uint8)
