# Analyzer (FastAPI)

Microservicio de análisis de imágenes aéreas (PDI/DSP + YOLOv8-seg opcional).

## Local (desarrollo)

```bash
# Desde la raíz del monorepo
pnpm setup:analyzer-env
pnpm setup:analyzer-venv   # Python 3.11–3.12 recomendado para YOLO/Torch

cd services/analyzer
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

- Sin `requirements-ml.txt` / sin pesos: pipeline PDI/DSP OK, `detections: []`.
- Con YOLO (Python 3.11/3.12): `.venv/bin/pip install -r requirements-ml.txt` y coloca `models/pothole_seg.pt`.

Debugging en Cursor: **Python: Debug Analyzer** / **Python: Analyzer Watch**.

## Entrenar YOLO

Dataset: `Pothole_Segmentation_YOLOv8/` (clase `Pothole`, YOLOv8-seg). Script:

```bash
python scripts/train_pothole.py --epochs 50 --device cpu
```

En perfil prod Docker:

```bash
docker compose --profile prod cp ./services/analyzer/models/pothole_seg.pt analyzer:/app/models/pothole_seg.pt
docker compose --profile prod restart analyzer
```
