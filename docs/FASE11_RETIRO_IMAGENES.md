# Fase 11 — Retiro del flujo de imágenes (PENDIENTE DE CONFIRMACIÓN)

**No ejecutar** hasta confirmación explícita. Inventario exacto:

## Rutas API a eliminar o archivar

| Ruta | Archivo |
|------|---------|
| `POST /api/iot/ingest` | `apps/web/src/app/api/iot/ingest/route.ts` |
| `POST /api/analyze` | `apps/web/src/app/api/analyze/route.ts` |
| `POST /api/inspections/[id]/images` | `apps/web/src/app/api/inspections/[id]/images/route.ts` |
| `GET /api/media/[imageId]` | `apps/web/src/app/api/media/[imageId]/route.ts` |
| `GET /api/inspections/[id]/pdf` | `apps/web/src/app/api/inspections/[id]/pdf/route.ts` (si solo PDF de fotos) |

## UI

- `apps/web/src/components/image-dropzone.tsx`
- `apps/web/src/components/new-inspection-form.tsx`
- `apps/web/src/components/inspection-list.tsx`
- `apps/web/src/components/inspection-review.tsx`
- `apps/web/src/components/pothole-overlay.tsx`
- `apps/web/src/app/recorridos/**`
- `apps/web/src/stores/new-inspection-store.ts`
- `apps/web/src/stores/inspection-store.ts`
- `apps/web/src/services/inspection-api.ts`

## Servicios / DI

- `apps/web/src/infrastructure/analyzer/analyze-image-service.ts`
- `apps/web/src/infrastructure/iot/iot-ingest-service.ts`
- `apps/web/src/infrastructure/analyzer/http-analyzer-client.ts` (método `analyze` imagen)
- MQTT/Mosquitto ya retirados del stack (no hay broker ni `MqttBridge`)
- `apps/web/src/infrastructure/pdf/pdf-lib-report-service.ts` (si no se reutiliza)
- Tokens/ports asociados en `di/tokens.ts`, `di/providers.ts`, `domain/ports.ts`

## Prisma / datos

Modelos afectados (decidir archivar vs drop en migración futura):

- `AerialImage`
- `Report` (ligado a imágenes)
- `Pothole`

Conservar / re-ligar opcionalmente: `Device`, `Telemetry`, `Flight`, `Inspection`.

## Edge

- `devices/raspberry-pi/agent/agent.py` — migrar a `/api/videos/upload`
- `devices/esp32/**` — si solo sube imagen

## Worker

- `POST /analyze` en `services/analyzer/app/api/routes.py`
- Preprocessing stills si no se reutiliza en tiling

## Impacto

- Datos históricos de fotos/reports dejarán de ser accesibles por UI.
- Migración debe ser incremental (no `migrate reset`).
