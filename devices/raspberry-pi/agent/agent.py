#!/usr/bin/env python3
"""
Stub de agente Raspberry Pi: telemetría MQTT + ingest HTTP de imagen.
No controla el dron; solo envía datos al VPS.
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

import requests

try:
    import paho.mqtt.publish as publish
except ImportError:  # pragma: no cover
    publish = None


def main() -> None:
    parser = argparse.ArgumentParser(description="Agente IoT Raspberry Pi (stub)")
    parser.add_argument("--image", type=Path, help="Ruta a imagen JPEG/PNG a subir")
    parser.add_argument("--web-url", default=os.getenv("WEB_URL", "http://localhost:3000"))
    parser.add_argument("--device-key", default=os.getenv("DEVICE_KEY", "pi-drone-01"))
    parser.add_argument(
        "--token",
        default=os.getenv("IOT_DEVICE_TOKEN", "change_me_device_token"),
    )
    parser.add_argument("--mqtt-host", default=os.getenv("MQTT_HOST", "localhost"))
    parser.add_argument("--mqtt-port", type=int, default=int(os.getenv("MQTT_PORT", "1883")))
    parser.add_argument("--battery", type=float, default=87.5)
    args = parser.parse_args()

    telemetry = {
        "battery": args.battery,
        "latitude": 19.4326,
        "longitude": -99.1332,
        "altitude": 25.0,
        "rssi": -60,
        "ts": time.time(),
    }

    topic = f"vial/{args.device_key}/telemetry"
    if publish is not None:
        try:
            publish.single(
                topic,
                payload=json.dumps(telemetry),
                hostname=args.mqtt_host,
                port=args.mqtt_port,
            )
            print(f"[mqtt] publicado en {topic}")
        except Exception as exc:  # noqa: BLE001
            print(f"[mqtt] omitido: {exc}")
    else:
        print("[mqtt] paho-mqtt no instalado; se omite publicación")

    data = {
        "deviceKey": args.device_key,
        "deviceToken": args.token,
        "deviceType": "RASPBERRY_PI",
        "deviceName": args.device_key,
        "battery": str(args.battery),
        "latitude": str(telemetry["latitude"]),
        "longitude": str(telemetry["longitude"]),
        "altitude": str(telemetry["altitude"]),
        "rssi": str(telemetry["rssi"]),
        "triggerAnalyze": "true",
    }

    files = None
    if args.image and args.image.is_file():
        files = {"file": (args.image.name, args.image.read_bytes(), "image/jpeg")}

    url = f"{args.web_url.rstrip('/')}/api/iot/ingest"
    resp = requests.post(url, data=data, files=files, timeout=120)
    print(f"[http] {resp.status_code} {resp.text}")


if __name__ == "__main__":
    main()
