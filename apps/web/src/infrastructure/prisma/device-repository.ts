import type { Device, DeviceType, Prisma, PrismaClient, Telemetry } from "@prisma/client";
import type { DeviceRepository } from "@/domain/ports";

export class PrismaDeviceRepository implements DeviceRepository {
  constructor(private readonly db: PrismaClient) {}

  upsertByKey(data: {
    deviceKey: string;
    name: string;
    type: DeviceType;
  }): Promise<Device> {
    return this.db.device.upsert({
      where: { deviceKey: data.deviceKey },
      create: data,
      update: { name: data.name, type: data.type },
    });
  }

  findByKey(deviceKey: string): Promise<Device | null> {
    return this.db.device.findUnique({ where: { deviceKey } });
  }

  addTelemetry(
    deviceId: string,
    data: {
      battery?: number;
      latitude?: number;
      longitude?: number;
      altitude?: number;
      rssi?: number;
      payload?: Prisma.InputJsonValue;
    },
  ): Promise<Telemetry> {
    return this.db.telemetry.create({
      data: { deviceId, ...data },
    });
  }
}
