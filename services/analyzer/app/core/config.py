from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    yolo_weights_path: str = "./models/pothole_seg.pt"
    # Factor de decimación / muestreo (DSP 2D). 2 = mitad de resolución.
    sample_factor: int = 2
    quantize_levels: int = 8
    binary_threshold: int = 110
    crop_margin_ratio: float = 0.1


settings = Settings()
