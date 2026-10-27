# ESP32 — telemetría (stub, fuera del stack)

El broker Mosquitto se retiró de este proyecto. El sketch `telemetry_sketch/telemetry_sketch.ino` publicaba MQTT y **ya no tiene destino** en el servidor.

La telemetría, si se retoma, debería ir por HTTP hacia Next.js (mismo patrón que el agente de la Raspberry Pi).
