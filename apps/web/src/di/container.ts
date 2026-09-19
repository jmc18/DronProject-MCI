import type { Token } from "./tokens";

/**
 * Contenedor DI mínimo basado en Map + tokens Symbol.
 * Pensado para uso en servidor (API routes / Server Components).
 */
export class Container {
  private readonly registry = new Map<Token, unknown>();

  register<T>(token: Token, implementation: T): void {
    this.registry.set(token, implementation);
  }

  resolve<T>(token: Token): T {
    const impl = this.registry.get(token);
    if (impl === undefined) {
      throw new Error(`DI: no hay implementación registrada para ${String(token)}`);
    }
    return impl as T;
  }
}
