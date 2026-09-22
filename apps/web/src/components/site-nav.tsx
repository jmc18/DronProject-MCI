import Link from "next/link";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/recorridos", label: "Recorridos" },
];

export function SiteNav() {
  return (
    <header className="border-b border-white/10 bg-asphalt-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/"
          className="font-orbitron text-sm uppercase tracking-[0.18em] text-signal-teal"
        >
          DronProject-MCI
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[color:var(--muted)] transition hover:text-asphalt-50"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/recorridos/nuevo"
            className="rounded-full bg-signal-teal px-3 py-1.5 text-sm font-medium text-asphalt-50"
          >
            Nuevo recorrido
          </Link>
        </nav>
      </div>
    </header>
  );
}
