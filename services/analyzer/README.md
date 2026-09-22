# Analyzer (FastAPI)

Microservicio de análisis de imágenes aéreas para detección/segmentación de baches.

## Local (sin Docker)

```bash
cd services/analyzer
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Coloca pesos YOLOv8-seg en `models/pothole_seg.pt` (o configura `YOLO_WEIGHTS_PATH`).
Sin pesos, `/analyze` responde con el pipeline PDI/DSP y `detections: []`.

## Entrenar YOLO (preentrenamiento + dataset de baches)

El dataset está en `Pothole_Segmentation_YOLOv8/Pothole_Segmentation_YOLOv8/` (clase `Pothole`, formato YOLOv8-seg). El script parte de **yolov8n-seg.pt** y deja `models/pothole_seg.pt`:

```bash
python scripts/train_pothole.py --epochs 50 --device cpu
```

Validación rápida del pipeline:

```bash
python scripts/train_pothole.py --epochs 1 --batch 2
```

Luego, en el stack Docker:

```bash
docker compose cp ./services/analyzer/models/pothole_seg.pt analyzer:/app/models/pothole_seg.pt
docker compose restart analyzer
```
