from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="Vial Analyzer",
    description="Pipeline vídeo MP4 8K (tiling + tracking) + YOLO; imagen /analyze deprecated",
    version="0.2.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
app.include_router(router)
