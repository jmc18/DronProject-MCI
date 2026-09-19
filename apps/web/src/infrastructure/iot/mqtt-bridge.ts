import type { MqttBridge } from "@/domain/ports";

/**
 * Stub del bridge MQTT.
 * En producción se suscribiría a Mosquitto y reenviaría mensajes al IotIngestService.
 *
 * Tópicos sugeridos:
 * - vial/{deviceKey}/telemetry  (JSON)
 * - vial/{deviceKey}/image       (metadatos; la imagen suele ir por HTTP multipart)
 */
export class StubMqttBridge implements MqttBridge {
  private running = false;

  constructor(private readonly mqttUrl: string) {}

  describeTopics(): string[] {
    return ["vial/+/telemetry", "vial/+/image", "vial/+/events"];
  }

  async start(): Promise<void> {
    // Intencional: no abre conexión real en el scaffold para no bloquear el arranque
    // sin broker. Documenta el contrato y deja listo el punto de extensión.
    this.running = true;
    console.info(
      `[MqttBridge] stub activo (url=${this.mqttUrl}). Tópicos: ${this.describeTopics().join(", ")}`,
    );
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }
}
