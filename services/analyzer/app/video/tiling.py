from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class Tile:
    x: int
    y: int
    w: int
    h: int
    image: np.ndarray


@dataclass
class Detection:
    confidence: float
    bbox: tuple[float, float, float, float]  # x,y,w,h absolutos en frame
    area_px: float | None = None


def parse_roi(roi: str, frame_w: int, frame_h: int) -> tuple[int, int, int, int]:
    if not roi.strip():
        return 0, 0, frame_w, frame_h
    parts = [int(p.strip()) for p in roi.split(",")]
    if len(parts) != 4:
        return 0, 0, frame_w, frame_h
    x, y, w, h = parts
    x = max(0, min(x, frame_w - 1))
    y = max(0, min(y, frame_h - 1))
    w = max(1, min(w, frame_w - x))
    h = max(1, min(h, frame_h - y))
    return x, y, w, h


def iter_tiles(
    frame: np.ndarray,
    tile_size: int,
    overlap: float,
    roi: str = "",
) -> list[Tile]:
    fh, fw = frame.shape[:2]
    rx, ry, rw, rh = parse_roi(roi, fw, fh)
    region = frame[ry : ry + rh, rx : rx + rw]
    h, w = region.shape[:2]
    step = max(1, int(tile_size * (1.0 - overlap)))
    tiles: list[Tile] = []
    y = 0
    while True:
        x = 0
        y2 = min(y + tile_size, h)
        y1 = max(0, y2 - tile_size) if y2 == h and y > 0 else y
        while True:
            x2 = min(x + tile_size, w)
            x1 = max(0, x2 - tile_size) if x2 == w and x > 0 else x
            tile_img = region[y1:y2, x1:x2]
            tiles.append(Tile(x=rx + x1, y=ry + y1, w=x2 - x1, h=y2 - y1, image=tile_img))
            if x2 >= w:
                break
            x += step
        if y2 >= h:
            break
        y += step
    return tiles if tiles else [Tile(x=rx, y=ry, w=rw, h=rh, image=region)]


def nms_merge(dets: list[Detection], iou_thresh: float = 0.45) -> list[Detection]:
    if not dets:
        return []
    order = sorted(dets, key=lambda d: d.confidence, reverse=True)
    keep: list[Detection] = []
    while order:
        best = order.pop(0)
        keep.append(best)
        order = [d for d in order if _iou(best.bbox, d.bbox) < iou_thresh]
    return keep


def _iou(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    ax2, ay2 = ax + aw, ay + ah
    bx2, by2 = bx + bw, by + bh
    ix1, iy1 = max(ax, bx), max(ay, by)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    iw, ih = max(0.0, ix2 - ix1), max(0.0, iy2 - iy1)
    inter = iw * ih
    if inter <= 0:
        return 0.0
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0
