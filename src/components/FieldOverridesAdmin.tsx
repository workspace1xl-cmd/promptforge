"use client";

import * as React from "react";
import { Badge, Button, Input, Segmented, Spinner, Toggle } from "@/components/ui";

interface FieldRow {
  fieldId: string;
  label: string;
  type: string;
  baseRequired: boolean;
  lockable: boolean;
  options: { value: string; label: string }[] | null;
  overrideId: string | null;
  required: boolean | null;
  locked: boolean;
  lockedValue: string | number | boolean | null;
}

interface DeptOption {
  key: string;
  name: string;
  icon: string | null;
}

const REQUIRED_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
];

export function FieldOverridesAdmin() {
  const [departments, setDepartments] = React.useState<DeptOption[] | null>(null);
  const [sel, setSel] = React.useState("");
  const [fields, setFields] = React.useState<FieldRow[] | null>(null);
  // Which department `fields` actually belongs to — lets the UI show a
  // loading state on switch without a synchronous setState(null) in the effect.
  const [fieldsForDept, setFieldsForDept] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };

  // The department list itself is config-driven (same source as the
  // compliance admin) — this screen never hardcodes which departments exist.
  React.useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/compliance");
      const data: DeptOption[] = await res.json();
      if (ignore) return;
      setDepartments(data);
      setSel((s) => s || data[0]?.key || "");
    })();
    return () => {
      ignore = true;
    };
  }, []);

  React.useEffect(() => {
    if (!sel) return;
    let ignore = false;
    (async () => {
      const res = await fetch(`/api/field-overrides?departmentKey=${encodeURIComponent(sel)}`);
      const data = await res.json();
      if (ignore) return;
      setFields(res.ok ? data.fields : []);
      setFieldsForDept(sel);
    })();
    return () => {
      ignore = true;
    };
  }, [sel]);

  const fieldsLoading = !departments || fieldsForDept !== sel;

  const patch = (fieldId: string, next: Partial<FieldRow>) =>
    setFields((prev) => prev?.map((f) => (f.fieldId === fieldId ? { ...f, ...next } : f)) ?? prev);

  const save = async (f: FieldRow) => {
    setSaving(f.fieldId);
    try {
      const res = await fetch("/api/field-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey: sel,
          fieldId: f.fieldId,
          required: f.required,
          locked: f.locked,
          lockedValue: f.locked ? f.lockedValue : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error ?? "Could not save.");
        return;
      }
      patch(f.fieldId, { overrideId: data.id });
      showToast(`Saved override for "${f.label}".`);
    } finally {
      setSaving(null);
    }
  };

  const reset = async (f: FieldRow) => {
    if (!f.overrideId) return;
    setSaving(f.fieldId);
    try {
      await fetch(`/api/field-overrides?id=${f.overrideId}`, { method: "DELETE" });
      patch(f.fieldId, { overrideId: null, required: null, locked: false, lockedValue: null });
      showToast(`Reset "${f.label}" to its default config.`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="relative">
      <div className="mb-6 flex flex-wrap gap-2">
        {departments?.map((d) => (
          <button
            key={d.key}
            onClick={() => setSel(d.key)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              sel === d.key
                ? "border-accent bg-accent-soft text-accent"
                : "border-line2 bg-surface text-ink2 hover:text-ink"
            }`}
          >
            <span className="mono text-[10px]">{d.icon}</span>
            {d.name}
          </button>
        ))}
      </div>

      {fieldsLoading || !fields ? (
        <div className="flex items-center gap-2 py-16 text-ink3">
          <Spinner /> Loading fields…
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {fields.map((f) => {
            const requiredState = f.required === true ? "required" : f.required === false ? "optional" : "default";
            const overridden = f.required !== null || f.locked;
            return (
              <div key={f.fieldId} className="rounded-xl border border-line bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="font-semibold text-ink">{f.label}</span>
                  <Badge>{f.type}</Badge>
                  {f.baseRequired && <Badge tone="accent">required by default</Badge>}
                  {overridden && <Badge tone="ok">overridden</Badge>}
                  {!f.lockable && (
                    <span className="ml-auto text-[11px] text-ink3">Can&rsquo;t be locked ({f.type})</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink3">
                      Required
                    </span>
                    <Segmented
                      options={REQUIRED_OPTIONS}
                      value={requiredState}
                      onChange={(v) =>
                        patch(f.fieldId, {
                          required: v === "required" ? true : v === "optional" ? false : null,
                        })
                      }
                    />
                  </div>

                  {f.lockable && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink3">
                        Lock to a fixed value
                      </span>
                      <Toggle checked={f.locked} onChange={(v) => patch(f.fieldId, { locked: v })} />
                    </div>
                  )}

                  {f.lockable && f.locked && (
                    <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink3">
                        Fixed value
                      </span>
                      {f.options ? (
                        <select
                          value={(f.lockedValue as string) ?? ""}
                          onChange={(e) => patch(f.fieldId, { lockedValue: e.target.value })}
                          className="w-full rounded-lg border border-line2 bg-surface2 px-3 py-2 text-sm text-ink"
                        >
                          <option value="">Select…</option>
                          {f.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={(f.lockedValue as string) ?? ""}
                          onChange={(e) => patch(f.fieldId, { lockedValue: e.target.value })}
                          maxLength={400}
                          placeholder="Fixed value shown to every user"
                        />
                      )}
                    </div>
                  )}

                  <div className="ml-auto flex gap-2 self-end">
                    <Button size="sm" variant="primary" disabled={saving === f.fieldId} onClick={() => save(f)}>
                      Save
                    </Button>
                    {f.overrideId && (
                      <Button size="sm" variant="ghost" disabled={saving === f.fieldId} onClick={() => reset(f)}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
