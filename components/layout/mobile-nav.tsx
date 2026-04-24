import Link from "next/link";

type NavItem = { href: string; label: string };

export function MobileNav({ nav }: { nav: NavItem[] }) {
  return (
    <nav className="mx-auto max-w-5xl px-2">
      <ul className="grid grid-cols-4 gap-1">
        {nav.slice(0, 4).map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              className="flex items-center justify-center py-3 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
