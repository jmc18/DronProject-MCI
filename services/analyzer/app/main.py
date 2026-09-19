from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="Vial Analyzer",
    description="Pipeline PDI/DSP + YOLOv8-seg para detección de baches",
    version="0.1.0",
)
app.include_router(router)
