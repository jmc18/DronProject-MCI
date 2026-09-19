# ESP32 — telemetría IoT (stub)

Nodo opcional para telemetría (batería, heartbeat, RSSI). La captura de imágenes
aéreas queda a cargo de la Raspberry Pi.

## Tópico MQTT

`vial/{deviceKey}/telemetry`

Payload JSON de ejemplo:

```json
{
  "battery": 91.2,
  "rssi": -55,
  "heartbeat": true
}
```

## Sketch

Ver `telemetry_sketch/telemetry_sketch.ino` (Arduino IDE / PlatformIO).
Ajusta `WIFI_SSID`, `WIFI_PASS`, `MQTT_HOST` y `DEVICE_KEY`.
