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

export class NotFoundError extends Error {
  readonly status = 404;

  constructor(entity: string, id: string) {
    super(`${entity} no encontrado (${id})`);
    this.name = "NotFoundError";
  }
}

export class InvalidStorageKeyError extends Error {
  readonly status = 400;

  constructor(message = "Clave de almacenamiento inválida") {
    super(message);
    this.name = "InvalidStorageKeyError";
  }
}
