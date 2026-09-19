# Analyzer (FastAPI)

Microservicio de análisis de imágenes aéreas para detección/segmentación de baches.

## Local (sin Docker)

```bash
cd services/analyzer
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Coloca pesos YOLOv8-seg en `models/pothole_seg.pt` (o configura `YOLO_WEIGHTS_PATH`).
Sin pesos, `/analyze` responde con el pipeline PDI/DSP y `detections: []`.
