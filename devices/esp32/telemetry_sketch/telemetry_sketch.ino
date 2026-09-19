/*
 * Stub ESP32: publica telemetría MQTT periódica hacia el broker del VPS.
 * Requiere: WiFi + PubSubClient (o AsyncMqttClient).
 */

#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "TU_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";
const char* MQTT_HOST = "TU_VPS_IP";
const uint16_t MQTT_PORT = 1883;
const char* DEVICE_KEY = "esp32-telemetry-01";

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

void ensureMqtt() {
  while (!mqtt.connected()) {
    String clientId = String("esp32-") + DEVICE_KEY;
    if (mqtt.connect(clientId.c_str())) {
      Serial.println("MQTT conectado");
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
}

void loop() {
  ensureMqtt();
  mqtt.loop();

  char topic[64];
  snprintf(topic, sizeof(topic), "vial/%s/telemetry", DEVICE_KEY);

  // Payload mínimo; ampliar con sensores reales según hardware.
  const char* payload = "{\"battery\":90.0,\"rssi\":-58,\"heartbeat\":true}";
  mqtt.publish(topic, payload);
  delay(10000);
}
