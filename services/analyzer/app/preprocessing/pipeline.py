from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.core.config import settings
from app.preprocessing.binary import to_binary
from app.preprocessing.crop import crop_roi
from app.preprocessing.grayscale import to_grayscale
from app.preprocessing.quantize import quantize
from app.preprocessing.rgb_meta import analyze_rgb
from app.preprocessing.sampling import downsample


@dataclass
class PipelineResult:
    image_meta: dict
    preprocess: dict
    working_bgr: np.ndarray
    gray: np.ndarray
    sampled: np.ndarray
    quantized: np.ndarray
    binary: np.ndarray
    cropped: np.ndarray


def run_preprocess_pipeline(image_bgr: np.ndarray) -> PipelineResult:
    """Pipeline PDI + DSP 2D alineado a los objetivos del proyecto."""
    meta = analyze_rgb(image_bgr)
    gray = to_grayscale(image_bgr)
    sampled = downsample(gray, settings.sample_factor)
    quantized = quantize(sampled, settings.quantize_levels)
    binary = to_binary(quantized, settings.binary_threshold)
    cropped = crop_roi(sampled, settings.crop_margin_ratio)

    # Imagen de trabajo para YOLO: BGR a resolución muestreada (color)
    working_bgr = downsample(image_bgr, settings.sample_factor)

    preprocess = {
        "sample_factor": settings.sample_factor,
        "quantize_levels": settings.quantize_levels,
        "binary_threshold": settings.binary_threshold,
        "crop_margin_ratio": settings.crop_margin_ratio,
        "sampled_shape": list(sampled.shape),
        "cropped_shape": list(cropped.shape),
        "binary_foreground_ratio": float((binary > 0).mean()),
    }

    return PipelineResult(
        image_meta=meta,
        preprocess=preprocess,
        working_bgr=working_bgr,
        gray=gray,
        sampled=sampled,
        quantized=quantized,
        binary=binary,
        cropped=cropped,
    )
