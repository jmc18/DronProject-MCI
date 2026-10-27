# Escenarios de prueba manual / integración (Fase 10)

## 1. Upload interrumpido a mitad

1. Iniciar upload grande a `POST /api/videos/upload` con headers válidos.
2. Abortar la conexión a ~50%.
3. Verificar: no existe fila en `video_jobs`, no hay `original.mp4` (solo posible `.part` que limpia el boot/`retention-cleanup`).
4. Reintentar con la **misma** `Idempotency-Key` y el mismo SHA → debe completar 200 y crear job.

## 2. Exceso `MAX_UPLOAD_MB`

1. Enviar `Content-Length` > límite → 413 inmediato.
2. Stream que supera el límite → 413; el directorio del job no debe quedar con `original.mp4`.

## 3. Disco insuficiente

1. Bajar `MIN_FREE_DISK_GB` a un valor enorme (p.ej. 99999).
2. Upload → **507** `{ success:false, message:"Espacio en disco insuficiente" }`.

## 4. Vídeo corrupto / sin stream

1. Subir MP4 con magic `ftyp` válido pero contenido basura (o sin track vídeo).
2. Upload puede devolver 200 (magic OK); el worker marca job `FAILED` tras ffprobe.

## 5. CI fixture

```bash
cd services/analyzer
pytest tests/test_ffprobe_and_tiling.py -q
node apps/web/scripts/test-upload-security.mjs
```

## 6. Contrato JSON

| Caso | Status | message |
|------|--------|---------|
| OK | 200 | Video recibido correctamente |
| sin video / no MP4 | 400 | El campo video es requerido |
| API key / HMAC | 401 | API key inválida |
| idempotency conflicto | 409 | Idempotency-Key reutilizada con contenido distinto |
| tamaño | 413 | Tamaño de archivo excedido |
| rate limit | 429 | Demasiadas solicitudes |
| save fail | 500 | No se pudo guardar el video |
