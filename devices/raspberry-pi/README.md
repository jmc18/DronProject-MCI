# Agente edge — Raspberry Pi

> **Deprecated (imágenes):** el camino soportado es subir **vídeo MP4** a `POST /api/videos/upload` con `x-api-key`, HMAC e `Idempotency-Key`. El stub actual aún usa `/api/iot/ingest` (protegido con API key).

El broker MQTT se retiró del stack. La telemetría va en el mismo POST HTTP.

## Configuración

```bash
export WEB_URL=http://TU_VPS:3000
export IOT_DEVICE_TOKEN=change_me_device_token
export API_KEY_CURRENT=change_me_api_key_current
export DEVICE_KEY=pi-drone-01
```

## Ejecutar stub

```bash
cd devices/raspberry-pi/agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python agent.py --image /ruta/foto.jpg
```
