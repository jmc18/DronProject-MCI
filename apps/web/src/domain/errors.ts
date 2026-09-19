export class OptimisticLockError extends Error {
  readonly status = 409;

  constructor(entity: string, id: string, expectedVersion: number) {
    super(
      `Conflicto de concurrencia optimista en ${entity} (${id}): versión esperada ${expectedVersion}`,
    );
    this.name = "OptimisticLockError";
  }
}

export class UnauthorizedDeviceError extends Error {
  readonly status = 401;

  constructor(message = "Token de dispositivo IoT inválido") {
    super(message);
    this.name = "UnauthorizedDeviceError";
  }
}
