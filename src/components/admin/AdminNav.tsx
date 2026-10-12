"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import a from "./admin.module.css";

const LINKS = [
  { href: "/sandberg", label: "Channels", match: (p: string) => p === "/sandberg" || p.startsWith("/sandberg/channels") },
  { href: "/sandberg/featured", label: "Featured", match: (p: string) => p.startsWith("/sandberg/featured") },
  { href: "/sandberg/countries", label: "Countries", match: (p: string) => p.startsWith("/sandberg/countries") },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={a.nav} aria-label="Admin">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={a.navLink} aria-current={l.match(pathname) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
