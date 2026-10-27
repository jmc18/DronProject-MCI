from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_BEST = (
    Path(__file__).resolve().parents[4]
    / "Pothole_Segmentation_YOLOv8"
    / "Pothole_Segmentation_YOLOv8"
    / "model"
    / "best.pt"
)


def default_weights_path() -> str:
    if _REPO_BEST.is_file():
        return str(_REPO_BEST)
    return "./models/pothole_seg.pt"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    yolo_weights_path: str = default_weights_path()
    # Factor de decimación / muestreo (DSP 2D). 2 = mitad de resolución.
    sample_factor: int = 2
    quantize_levels: int = 8
    binary_threshold: int = 110
    crop_margin_ratio: float = 0.1

    # Auth interna
    internal_token: str = ""
    web_internal_url: str = "http://127.0.0.1:3000"

    # Pipeline vídeo
    frame_stride: int = 15
    target_analysis_fps: float = 3.0
    tile_size: int = 1280
    tile_overlap: float = 0.2
    roi: str = ""  # "x,y,w,h" opcional
    imgsz: int = 640
    confidence_threshold: float = 0.35
    processed_max_height: int = 1440
    worker_tmp_dir: str = "./tmp"
    job_timeout_minutes: int = 180
    progress_interval_sec: float = 5.0


settings = Settings()
