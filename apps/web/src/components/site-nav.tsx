import Link from "next/link";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/videos", label: "Vídeos" },
  { href: "/recorridos", label: "Recorridos (legacy)" },
];

export function SiteNav() {
  return (
    <header className="border-b border-white/10 bg-asphalt-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/"
          className="font-orbitron text-xs uppercase tracking-[0.14em] text-signal-teal sm:text-sm sm:tracking-[0.18em]"
        >
          DronProject-MCI
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
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
            href="/videos/nuevo"
            className="ui-button bg-signal-teal px-3 py-1.5 text-sm font-medium text-asphalt-50"
          >
            Subir vídeo
          </Link>
        </nav>
      </div>
    </header>
  );
}
