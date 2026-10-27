# DronProject-MCI

Sistema de **Monitoreo de Infraestructura Vial mediante Drones**: upload de vídeo MP4 (hasta 8K), jobs asíncronos con YOLOv8-seg (tiling + tracking), almacenamiento en PostgreSQL y UI/API en Next.js.

> **Deprecated:** el flujo por imágenes (`/api/iot/ingest`, `/api/analyze`, upload de fotos) sigue en el repo protegido con `x-api-key`, pero el camino soportado es `POST /api/videos/upload`.

## Arquitectura

| Componente | Rol | Dónde corre en desarrollo |
|------------|-----|---------------------------|
| **Next.js** | Frontend + API + Prisma | Host (`pnpm dev`) con hot reload |
| **PostgreSQL** | Base de datos (solo vía Prisma) | Docker (volumen `pgdata`) |
| **Analyzer (Python)** | YOLO vídeo (no es el backend principal) | Host (venv + uvicorn `--reload`) |

```text
Cursor / VS Code
   ├── Next.js  → debugger + hot reload
   └── Python   → debugger + breakpoints (YOLO / PDI)

Docker
   └── PostgreSQL  (persistente)
```

> No hay integración LLM en el código actual. Si se añade después, irá en el analyzer o como servicio aparte, no sustituyendo a Next/Prisma.

---

## Desarrollo diario (recomendado)

### 1. Primera vez

```bash
cp .env.example .env
pnpm setup:web-env
pnpm setup:analyzer-env
pnpm install

# Infra (solo Postgres; NO reconstruye imágenes de app)
pnpm docker:up

# Cliente Prisma (una vez / tras cambiar schema)
pnpm prisma:generate
# Las migraciones se aplican solas al hacer `pnpm dev` / Docker (como EF Core Migrate).
# Solo usa `pnpm prisma:migrate` cuando CREAS una migración nueva en desarrollo.

# Analyzer (venv)
pnpm setup:analyzer-venv
# Requiere Python 3.11–3.13 (recomendado **3.13** local; Docker usa 3.11).
# No usar Python 3.14 todavía (faltan wheels estables de NumPy/OpenCV/Torch).
```

Opcional: pesos YOLO en `services/analyzer/models/pothole_seg.pt`. En macOS Intel con Python 3.13, PyTorch puede no instalarse; el analyzer igual corre en modo stub (PDI/DSP). Para YOLO real usa Python **3.11 o 3.12** y `pnpm setup:analyzer-venv` de nuevo (o `.venv/bin/pip install -r requirements-ml.txt`).

### 2. Cada día

```bash
# Terminal A — Postgres (si no está arriba)
pnpm docker:up

# Terminal B — Next.js (hot reload)
pnpm dev

# Terminal C — Analyzer (hot reload)
pnpm dev:python
```

Desde Cursor/VS Code (Run and Debug):

| Configuración | Uso |
|---------------|-----|
| **Dev: Infra + Next + Analyzer** | Arranca Docker infra + Next debug + Python watch |
| **Next.js: Debug** | Breakpoints en API routes / server |
| **Python: Debug Analyzer** | Breakpoints estables (sin `--reload`) |
| **Python: Analyzer Watch** | Reload + debug (subprocesos) |

Tasks (Terminal → Run Task): `Docker: Start/Stop/Logs`, `Prisma: Generate/Migrate`, `Python: Create venv + install`.

### 3. Verificación rápida

```bash
curl -s http://127.0.0.1:3000/api/health
curl -s http://127.0.0.1:8000/health
docker compose ps
```

- UI: http://127.0.0.1:3000  
- Analyzer: http://127.0.0.1:8000  
- Postgres: `127.0.0.1:5433` (el contenedor escucha 5432 por dentro; volumen `pgdata`; `docker compose down` **sin** `-v` conserva datos)

### Scripts útiles

| Script | Qué hace |
|--------|----------|
| `pnpm docker:up` | Postgres |
| `pnpm docker:down` | Baja infra (conserva volúmenes) |
| `pnpm docker:logs` | Logs de infra |
| `pnpm dev` / `pnpm dev:web` | Next.js watch |
| `pnpm dev:python` | Uvicorn `--reload` |
| `pnpm prisma:generate` | Cliente Prisma |
| `pnpm prisma:migrate` | **Crear** migración nueva (`migrate dev`) |
| `pnpm prisma:deploy` / arranque | **Aplicar** pendientes (`migrate deploy`; automático en `pnpm dev` y Docker) |
| `pnpm docker:prod` / `pnpm stack:up` | Stack completo en Docker (`--profile prod`) |

---

## Despliegue VPS (perfil `prod`)

```bash
cp .env.example .env
# Edita passwords/tokens. DATABASE_URL debe usar host `postgres`.

docker compose --profile prod up -d --build
# equivalente: pnpm docker:prod
```

Logs: `docker compose --profile prod logs -f web analyzer`

### Pesos YOLOv8 (prod)

```bash
cd services/analyzer && source .venv/bin/activate
python scripts/train_pothole.py --epochs 50 --device cpu
docker compose --profile prod cp ./models/pothole_seg.pt analyzer:/app/models/pothole_seg.pt
docker compose --profile prod restart analyzer
```

---

## Upload de vídeo (camino soportado)

`POST /api/videos/upload` — multipart campo `video`, headers `x-api-key`, `Idempotency-Key`, firma HMAC (`x-timestamp`, `x-signature`, `x-content-sha256`).

Ver variables en `.env.example` (`MAX_UPLOAD_MB`, `API_KEY_*`, `INTERNAL_TOKEN`, etc.).

### Roadmap v2 (no implementado)

Subida por chunks reanudable (`Upload-Offset` / sesiones). La interfaz `ResumableUploadSession` está preparada en el dominio; el contrato v1 multipart no cambia.

## IoT (edge) — deprecated (imágenes)

- Raspberry Pi: [`devices/raspberry-pi`](devices/raspberry-pi)
- ESP32: [`devices/esp32`](devices/esp32)

Ingestión HTTP legacy: `POST /api/iot/ingest` (requiere `x-api-key`). Migrar a `/api/videos/upload`.

El broker MQTT (Mosquitto) se retiró del stack. La telemetría, si se necesita, va por HTTP.

### Criterio de conteo de baches (vídeo)

- `totalDetections`: cajas detectadas en todos los frames muestreados (tras NMS por tile).
- `totalPotholes`: tracks únicos (ByteTrack/BoT-SORT). Un mismo bache visto en N frames cuenta como **1**.

## OCC

`Inspection`, `Report` y `Pothole` usan `version`; conflictos → **409**.

## Estructura

```
apps/web/                 Next.js + Prisma + DI
services/analyzer/        FastAPI PDI/DSP + YOLO
services/analyzer/scripts/train_pothole.py
devices/                  Stubs edge
.vscode/                  Launch + tasks de desarrollo
docker-compose.yml        Infra por defecto; apps con --profile prod
```
