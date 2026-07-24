"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

function ThemeToggle() {
  // Lazy initializer, not an effect: by the time this client component
  // hydrates, the inline theme-init script in <head> has already set the
  // class, so reading it here avoids an extra render and a setState-in-effect.
  const [dark, setDark] = React.useState<boolean | null>(() =>
    typeof document === "undefined"
      ? null
      : document.documentElement.classList.contains("dark"),
  );

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("pf-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      className="grid h-9 w-9 place-items-center rounded-lg border border-line2 bg-surface text-ink2 transition-colors hover:bg-surface2 hover:text-ink cursor-pointer"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "text-ink bg-surface2" : "text-ink2 hover:text-ink hover:bg-surface2",
      )}
    >
      {label}
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <svg viewBox="0 0 32 32" width="30" height="30" fill="none" aria-hidden>
            <rect x="4" y="4" width="24" height="24" rx="7" className="stroke-ink" strokeWidth="2" />
            <path
              d="M11 20 L16 10.5 L21 20"
              className="stroke-accent"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx="16" cy="22" r="2.3" className="fill-forge" />
          </svg>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-ink">PromptForge</div>
            <div className="mono text-[10px] tracking-wider text-ink3">
              DEPARTMENT-AWARE PROMPT ENGINE
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink href="/" label="New" />
          <NavLink href="/templates" label="Templates" />
          <NavLink href="/history" label="History" />
          <NavLink href="/admin/compliance" label="Rules" />
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
