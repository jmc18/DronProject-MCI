import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-asphalt-50">Recorrido no encontrado</h1>
      <p className="mt-3 text-[color:var(--muted)]">
        Es posible que el enlace sea antiguo o que el informe se haya eliminado.
      </p>
      <Link
        href="/recorridos"
        className="mt-6 inline-flex rounded-full bg-signal-teal px-5 py-2.5 text-sm font-medium text-asphalt-50"
      >
        Volver a recorridos
      </Link>
    </main>
  );
}
