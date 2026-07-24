"use client";

import * as React from "react";
import { Badge, Button, Input, Segmented, Spinner, Textarea, Toggle } from "@/components/ui";

interface Rule {
  id: string;
  code: string;
  label: string;
  description: string;
  severity: string;
  active: boolean;
}
interface Dept {
  key: string;
  name: string;
  icon: string | null;
  rules: Rule[];
}

export function ComplianceAdmin() {
  const [depts, setDepts] = React.useState<Dept[] | null>(null);
  const [sel, setSel] = React.useState("");
  const [toast, setToast] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({
    code: "",
    label: "",
    description: "",
    severity: "hard",
  });

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  };

  const load = React.useCallback(async () => {
    const res = await fetch("/api/compliance");
    const data: Dept[] = await res.json();
    setDepts(data);
    setSel((s) => s || data[0]?.key || "");
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const dept = depts?.find((d) => d.key === sel);

  const patchLocal = (ruleId: string, patch: Partial<Rule>) =>
    setDepts((prev) =>
      prev?.map((d) =>
        d.key !== sel
          ? d
          : { ...d, rules: d.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)) },
      ) ?? prev,
    );

  const saveRule = async (rule: Rule) => {
    const res = await fetch("/api/compliance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: rule.id,
        label: rule.label,
        description: rule.description,
        severity: rule.severity,
        active: rule.active,
      }),
    });
    showToast(res.ok ? "Rule saved." : "Could not save the rule.");
  };

  const deleteRule = async (id: string) => {
    const res = await fetch(`/api/compliance?id=${id}`, { method: "DELETE" });
    setPendingDelete(null);
    if (res.ok) {
      setDepts((prev) =>
        prev?.map((d) =>
          d.key !== sel ? d : { ...d, rules: d.rules.filter((r) => r.id !== id) },
        ) ?? prev,
      );
      showToast("Rule deleted.");
    } else showToast("Could not delete the rule.");
  };

  const addRule = async () => {
    if (!draft.code.trim() || !draft.label.trim() || !draft.description.trim()) {
      showToast("Code, label and description are all required.");
      return;
    }
    const res = await fetch("/api/compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departmentKey: sel, ...draft }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data?.error ?? "Could not add the rule.");
      return;
    }
    setDraft({ code: "", label: "", description: "", severity: "hard" });
    showToast("Rule added.");
    load();
  };

  if (!depts) {
    return (
      <div className="flex items-center gap-2 py-16 text-ink3">
        <Spinner /> Loading rules…
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-6 flex flex-wrap gap-2">
        {depts.map((d) => (
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

      {dept && (
        <div className="flex flex-col gap-3">
          {dept.rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <Badge>{rule.code}</Badge>
                <div className="ml-auto flex items-center gap-3">
                  <Toggle
                    checked={rule.active}
                    onChange={(v) => patchLocal(rule.id, { active: v })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  value={rule.label}
                  maxLength={80}
                  onChange={(e) => patchLocal(rule.id, { label: e.target.value })}
                  placeholder="Rule label"
                />
                <Textarea
                  value={rule.description}
                  maxLength={400}
                  onChange={(e) => patchLocal(rule.id, { description: e.target.value })}
                  placeholder="What the rule enforces"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented
                    options={[
                      { value: "hard", label: "Hard" },
                      { value: "soft", label: "Soft" },
                    ]}
                    value={rule.severity}
                    onChange={(v) => v && patchLocal(rule.id, { severity: v })}
                  />
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => saveRule(rule)}>
                      Save
                    </Button>
                    {pendingDelete === rule.id ? (
                      <>
                        <Button size="sm" variant="danger" onClick={() => deleteRule(rule.id)}>
                          Confirm delete
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="danger" onClick={() => setPendingDelete(rule.id)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* add rule */}
          <div className="rounded-xl border border-dashed border-line2 bg-surface2/40 p-4">
            <div className="eyebrow mb-3">Add a rule</div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Input
                  value={draft.code}
                  maxLength={40}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  placeholder="Code (e.g. SEC-007)"
                  className="max-w-[200px]"
                />
                <Input
                  value={draft.label}
                  maxLength={80}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="Rule label"
                  className="flex-1"
                />
              </div>
              <Textarea
                value={draft.description}
                maxLength={400}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What the rule enforces"
              />
              <div className="flex items-center gap-3">
                <Segmented
                  options={[
                    { value: "hard", label: "Hard" },
                    { value: "soft", label: "Soft" },
                  ]}
                  value={draft.severity}
                  onChange={(v) => v && setDraft({ ...draft, severity: v })}
                />
                <Button size="sm" variant="forge" className="ml-auto" onClick={addRule}>
                  Add rule
                </Button>
              </div>
            </div>
          </div>
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
