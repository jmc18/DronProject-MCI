# Analyzer (FastAPI)

Microservicio de análisis de **vídeo MP4** (ffprobe → muestreo → tiling SAHI → NMS → tracking → artefactos). El endpoint de imagen `POST /analyze` está **deprecated**.

## Local (desarrollo)

```bash
# Desde la raíz del monorepo
pnpm setup:analyzer-env
pnpm setup:analyzer-venv   # Python 3.11–3.12 recomendado para YOLO/Torch

cd services/analyzer
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Requiere `INTERNAL_TOKEN` alineado con Next.js. `ffprobe`/`ffmpeg` en el PATH.

- `GET /health` — `device`, `model`, `version`, `yolo_loaded`
- `POST /internal/jobs` — body `{ "jobId", "path", "model" }` + header `X-Internal-Token`
- `POST /analyze` — deprecated (imágenes), también con token

### Conteo de baches

- `totalDetections`: cajas tras NMS por frame (tiles fusionados).
- `totalPotholes`: tracks únicos (IoU temporal greedy). Un bache visto en N frames cuenta como **1**.

### GPU

Sin CUDA el worker loguea warning y ETA. Procesar 8K en CPU es impráctico.

### Tests

```bash
pip install pytest
pytest tests/test_ffprobe_and_tiling.py -q
```

## Entrenar YOLO

```bash
python scripts/train_pothole.py --epochs 50 --device cpu
```
