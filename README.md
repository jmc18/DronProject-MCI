# DronProject-MCI

Sistema de **Monitoreo de Infraestructura Vial mediante Drones**: ingestión IoT (Raspberry Pi / ESP32), almacenamiento en PostgreSQL, análisis PDI/DSP + YOLOv8-seg (FastAPI) y UI/API en Next.js.

Diseñado para desplegarse en un **VPS Linux de recursos ajustados** con un solo comando Docker Compose.

## Arquitectura

| Servicio   | Rol                                      |
|------------|------------------------------------------|
| `postgres` | PostgreSQL 16 (persistente)              |
| `mosquitto`| Broker MQTT (telemetría edge)            |
| `web`      | Next.js (App Router) + Prisma + DI       |
| `analyzer` | FastAPI + OpenCV + Ultralytics (CPU)     |

## Despliegue en VPS (recomendado)

Requisitos: Docker Engine + Docker Compose plugin, ~2 GB RAM libres (ideal ≥4 GB).

```bash
# 1. Clonar
git clone <URL_DEL_REPO> DronProject-MCI
cd DronProject-MCI

# 2. Variables de entorno
cp .env.example .env
# Edita .env: POSTGRES_PASSWORD, IOT_DEVICE_TOKEN, etc.

# 3. Levantar todo el stack
docker compose up -d --build
```

Verificación:

```bash
docker compose ps
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:8000/health
```

- UI / API web: `http://TU_VPS:3000` — recorridos, galería de análisis e informe PDF
- Analyzer (solo localhost por defecto): `http://127.0.0.1:8000`
- MQTT: puerto `1883` (expuesto para dispositivos edge)
- Postgres: solo `127.0.0.1:5432` (no expuesto a Internet)

Logs:

```bash
docker compose logs -f web analyzer
```

Detener:

```bash
docker compose down
# Conservar datos: no uses -v
# Borrar volúmenes: docker compose down -v
```

### Pesos YOLOv8

El analyzer espera `pothole_seg.pt`. Entrena un modelo de segmentación de baches partiendo de **yolov8n-seg.pt** (preentrenamiento COCO-seg) y el dataset local `Pothole_Segmentation_YOLOv8/`:

```bash
cd services/analyzer
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/train_pothole.py --epochs 50 --device cpu
```

En CPU puede tardar varias horas. Con GPU: `--device 0`. Comprueba el script con `--epochs 1 --batch 2`.

Copia el resultado al contenedor:

```bash
docker compose cp ./services/analyzer/models/pothole_seg.pt analyzer:/app/models/pothole_seg.pt
docker compose restart analyzer
```

Sin pesos, el pipeline PDI/DSP funciona y `/analyze` devuelve `detections: []` con un `warning`.

La UI de revisión está en `/recorridos`. Cada recorrido genera un PDF en `/api/inspections/:id/pdf`.

### Notas de recursos (VPS)

- Analyzer: **1 worker** Uvicorn, sin CUDA (`mem_limit` ~1.5G).
- Web: Next.js **standalone** (`mem_limit` ~512M).
- Postgres / Mosquitto: límites bajos (512M / 64M).
- Siguiente paso opcional: reverse proxy TLS (Caddy/Nginx) delante del puerto 3000.

## Desarrollo local (opcional, fuera de Docker completo)

```bash
# Solo infra
cp .env.example .env
docker compose up -d postgres mosquitto

# Web (pnpm)
pnpm install
cd apps/web
# Ajusta DATABASE_URL a localhost en .env local
pnpm exec prisma migrate deploy
pnpm dev

# Analyzer
cd services/analyzer
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## IoT (edge)

- Raspberry Pi (imágenes + telemetría): [`devices/raspberry-pi`](devices/raspberry-pi)
- ESP32 (telemetría): [`devices/esp32`](devices/esp32)

Ingestión HTTP: `POST /api/iot/ingest` con `deviceKey`, `deviceToken` e imagen opcional.

## Control de concurrencia optimista (OCC)

Las tablas `Inspection`, `Report` y `Pothole` incluyen `version`. Las actualizaciones de negocio validan la versión esperada e incrementan el contador; si hay conflicto responden **409**.

## Estructura

```
apps/web/              Next.js + Prisma + DI (UI /recorridos e informe PDF)
services/analyzer/     FastAPI PDI/DSP + YOLO
services/analyzer/scripts/train_pothole.py
Pothole_Segmentation_YOLOv8/  Dataset de fine-tune
devices/               Stubs Raspberry Pi / ESP32
infra/mosquitto/       Config MQTT
docker-compose.yml     Stack unificado VPS
```
