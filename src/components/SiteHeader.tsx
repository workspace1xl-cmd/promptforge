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

function NavLink({ href, label, onNavigate }: { href: string; label: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onNavigate}
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
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
            <div className="mono hidden text-[10px] tracking-wider text-ink3 min-[360px]:block">
              DEPARTMENT-AWARE PROMPT ENGINE
            </div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          <NavLink href="/" label="New" />
          <NavLink href="/templates" label="Templates" />
          <NavLink href="/history" label="History" />
          <NavLink href="/analytics" label="Analytics" />
          <NavLink href="/admin/compliance" label="Rules" />
          <NavLink href="/admin/fields" label="Fields" />
          <div className="ml-1">
            <ThemeToggle />
          </div>
        </nav>
        <button
          type="button"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="grid h-9 min-w-9 place-items-center rounded-lg border border-line2 bg-surface px-2 text-lg text-ink2 transition-colors hover:bg-surface2 hover:text-ink md:hidden"
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </div>
      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="border-t border-line bg-surface px-4 py-3 md:hidden"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-1">
            <NavLink href="/" label="New prompt" onNavigate={() => setMenuOpen(false)} />
            <NavLink href="/templates" label="Templates" onNavigate={() => setMenuOpen(false)} />
            <NavLink href="/history" label="History" onNavigate={() => setMenuOpen(false)} />
            <NavLink href="/analytics" label="Analytics" onNavigate={() => setMenuOpen(false)} />
            <NavLink href="/admin/compliance" label="Rules" onNavigate={() => setMenuOpen(false)} />
            <NavLink href="/admin/fields" label="Fields" onNavigate={() => setMenuOpen(false)} />
          </div>
          <div className="mx-auto mt-2 flex max-w-6xl items-center justify-between border-t border-line pt-3">
            <span className="text-xs font-medium text-ink3">Appearance</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
