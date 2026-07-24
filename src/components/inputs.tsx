"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------- MultiSelect (with optional free-text "Other") ---------------- */

export function MultiSelect({
  options,
  value,
  onChange,
  allowOther,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
  allowOther?: boolean;
}) {
  const [other, setOther] = React.useState("");
  const optionValues = new Set(options.map((o) => o.value));
  const custom = value.filter((v) => !optionValues.has(v));

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const addOther = () => {
    const v = other.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setOther("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer",
                on
                  ? "bg-accent text-accent-fg border-accent"
                  : "bg-surface2 text-ink2 border-line2 hover:border-ink3 hover:text-ink",
              )}
            >
              {o.label}
            </button>
          );
        })}
        {custom.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-forge bg-forge-soft px-2.5 py-1.5 text-[13px] font-medium text-forge cursor-pointer"
          >
            {c}
            <span aria-hidden>×</span>
          </button>
        ))}
      </div>
      {allowOther && (
        <div className="flex gap-2">
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOther();
              }
            }}
            placeholder="Other — type and press Enter"
            maxLength={60}
            className="flex-1 rounded-lg border border-line2 bg-surface2 px-3 py-1.5 text-[13px] text-ink placeholder:text-ink3 focus:outline-none focus:border-accent focus:bg-surface"
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- Chips ---------------- */

export function Chips({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = React.useState("");
  const add = () => {
    const v = text.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-line2 bg-surface2 p-1.5 focus-within:border-accent focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/25">
      {value.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft py-1 pl-2.5 pr-1.5 text-[12.5px] font-medium text-accent"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="text-accent/70 hover:text-accent cursor-pointer"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length ? "" : placeholder || "Add and press Enter"}
        maxLength={80}
        className="min-w-[140px] flex-1 bg-transparent px-1.5 py-1 text-[13.5px] text-ink placeholder:text-ink3 focus:outline-none"
      />
    </div>
  );
}
