# Agente edge — Raspberry Pi

Captura imágenes (cámara del dron / USB) y las envía al backend VPS.

## Flujo

1. Publica telemetría MQTT a `vial/{deviceKey}/telemetry`.
2. Sube la imagen por HTTP multipart a `POST /api/iot/ingest`.

## Configuración

```bash
export WEB_URL=http://TU_VPS:3000
export IOT_DEVICE_TOKEN=change_me_device_token
export DEVICE_KEY=pi-drone-01
export MQTT_HOST=TU_VPS
export MQTT_PORT=1883
```

## Ejecutar stub

```bash
cd devices/raspberry-pi/agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python agent.py --image /ruta/foto.jpg
```
