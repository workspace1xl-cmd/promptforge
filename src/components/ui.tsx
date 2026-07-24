import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */

type Variant = "primary" | "forge" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-45 disabled:cursor-not-allowed";

const BTN_VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg border border-accent hover:opacity-90",
  forge: "bg-forge text-white border border-forge hover:opacity-90",
  outline: "bg-surface text-ink border border-line2 hover:bg-surface2",
  ghost: "bg-transparent text-ink2 border border-transparent hover:bg-surface2 hover:text-ink",
  danger:
    "bg-surface text-danger border border-danger/40 hover:bg-danger-soft hover:border-danger",
};

const BTN_SIZE: Record<Size, string> = {
  sm: "text-[13px] px-3 py-1.5",
  md: "text-sm px-4 py-2",
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button({
  variant = "outline",
  size = "md",
  href,
  className,
  children,
  ...props
}: ButtonProps) {
  const cls = cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
  if (href) {
    return (
      <a href={href} className={cls} {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-line bg-surface shadow-sm", className)}
      {...props}
    />
  );
}

/* ---------------- Badge ---------------- */

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "forge" | "ok";
}) {
  const tones = {
    neutral: "bg-surface2 text-ink2 border-line2",
    accent: "bg-accent-soft text-accent border-transparent",
    forge: "bg-forge-soft text-forge border-transparent",
    ok: "bg-ok/10 text-ok border-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold mono",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Inputs ---------------- */

const FIELD_BASE =
  "w-full rounded-lg border border-line2 bg-surface2 text-sm text-ink placeholder:text-ink3 px-3 py-2 transition-colors focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/25";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD_BASE, className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(FIELD_BASE, "min-h-[84px] resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("text-[13px] font-semibold text-ink", className)} {...props} />
  );
}

/* ---------------- Segmented (controlled pills) ---------------- */

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(on ? undefined : o.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer",
              on
                ? "bg-accent text-accent-fg border-accent"
                : "bg-surface2 text-ink2 border-line2 hover:border-ink3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Toggle ---------------- */

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5 cursor-pointer"
    >
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-line2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
      <span className="mono text-[11px] tracking-wide text-ink3">
        {checked ? "YES" : "NO"}
      </span>
    </button>
  );
}

/* ---------------- Tabs (controlled) ---------------- */

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-0.5 border-b border-line px-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          disabled={t.disabled}
          onClick={() => !t.disabled && onChange(t.id)}
          title={t.disabled ? "Available for engineering & data use cases." : ""}
          className={cn(
            "-mb-px border-b-2 px-4 py-3 text-[13.5px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed",
            value === t.id
              ? "border-forge text-forge"
              : t.disabled
                ? "border-transparent text-line2"
                : "border-transparent text-ink3 hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Progress ---------------- */

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
      <div
        className="h-full rounded-full bg-accent transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/* ---------------- Tooltip (CSS hover) ---------------- */

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        className="grid h-4 w-4 cursor-help place-items-center rounded-full border border-line2 text-[10px] font-bold text-ink3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={text}
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-line bg-ink px-3 py-2 text-xs leading-snug text-bg opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/* ---------------- Spinner ---------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
