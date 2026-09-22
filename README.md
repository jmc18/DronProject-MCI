# DronProject-MCI

Sistema de **Monitoreo de Infraestructura Vial mediante Drones**: ingestión IoT (Raspberry Pi / ESP32), almacenamiento en PostgreSQL, análisis PDI/DSP + YOLOv8-seg (FastAPI) y UI/API en Next.js.

## Arquitectura

| Componente | Rol | Dónde corre en desarrollo |
|------------|-----|---------------------------|
| **Next.js** | Frontend + API + Prisma + IoT | Host (`pnpm dev`) con hot reload |
| **PostgreSQL** | Base de datos (solo vía Prisma) | Docker (volumen `pgdata`) |
| **Mosquitto** | Broker MQTT | Docker |
| **Analyzer (Python)** | YOLO + PDI/DSP (no es el backend principal) | Host (venv + uvicorn `--reload`) |

```text
Cursor / VS Code
   ├── Next.js  → debugger + hot reload
   └── Python   → debugger + breakpoints (YOLO / PDI)

Docker
   ├── PostgreSQL  (persistente)
   └── Mosquitto
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

# Infra (solo Postgres + Mosquitto; NO reconstruye imágenes de app)
pnpm docker:up

# Prisma
pnpm prisma:generate
pnpm prisma:migrate

# Analyzer (venv)
pnpm setup:analyzer-venv
# Requiere Python 3.11–3.13 (recomendado **3.13** local; Docker usa 3.11).
# No usar Python 3.14 todavía (faltan wheels estables de NumPy/OpenCV/Torch).
```

Opcional: pesos YOLO en `services/analyzer/models/pothole_seg.pt`. En macOS Intel con Python 3.13, PyTorch puede no instalarse; el analyzer igual corre en modo stub (PDI/DSP). Para YOLO real usa Python **3.11 o 3.12** y `pnpm setup:analyzer-venv` de nuevo (o `.venv/bin/pip install -r requirements-ml.txt`).

### 2. Cada día

```bash
# Terminal A — infra (si no está arriba)
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
- MQTT: `1883`  
- Postgres: `127.0.0.1:5432` (volumen `pgdata`; `docker compose down` **sin** `-v` conserva datos)

### Scripts útiles

| Script | Qué hace |
|--------|----------|
| `pnpm docker:up` | Postgres + Mosquitto |
| `pnpm docker:down` | Baja infra (conserva volúmenes) |
| `pnpm docker:logs` | Logs de infra |
| `pnpm dev` / `pnpm dev:web` | Next.js watch |
| `pnpm dev:python` | Uvicorn `--reload` |
| `pnpm prisma:generate` | Cliente Prisma |
| `pnpm prisma:migrate` | Migraciones en desarrollo |
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

## IoT (edge)

- Raspberry Pi: [`devices/raspberry-pi`](devices/raspberry-pi)
- ESP32: [`devices/esp32`](devices/esp32)

Ingestión HTTP: `POST /api/iot/ingest` (`deviceKey`, `deviceToken`, imagen opcional).

El bridge MQTT en Next es stub documentado; Mosquitto sí corre para dispositivos y pruebas.

## OCC

`Inspection`, `Report` y `Pothole` usan `version`; conflictos → **409**.

## Estructura

```
apps/web/                 Next.js + Prisma + DI
services/analyzer/        FastAPI PDI/DSP + YOLO
services/analyzer/scripts/train_pothole.py
devices/                  Stubs edge
infra/mosquitto/          Config MQTT
.vscode/                  Launch + tasks de desarrollo
docker-compose.yml        Infra por defecto; apps con --profile prod
```
