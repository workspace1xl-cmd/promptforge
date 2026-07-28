"use client";

import * as React from "react";
import { Badge, Button, Segmented, Spinner, Tabs, Textarea } from "@/components/ui";
import type { GenerateOptions } from "@/lib/departments/types";
import { HandoffPanel } from "./HandoffPanel";

export interface GenerateResult {
  prompt: string;
  sop: string;
  technique: string;
  patternsUsed: string[];
  provider: string;
  outputFormat: string;
  meta?: Record<string, unknown>;
  generatedPromptId?: string;
  qualityScore?: number;
  variantLabel?: string | null;
}

interface QualityCriterion {
  key: string;
  label: string;
  passed: boolean;
  note: string;
  weight: "required" | "bonus";
}
interface QualityReport {
  score: number;
  criteria: QualityCriterion[];
  repairedBy: string;
}
interface ReviewerReport {
  id: string;
  label: string;
  summary: string;
  status: "completed" | "fallback";
  findings: Array<{ severity: string; finding: string; recommendation: string }>;
  missingRequirements: string[];
  acceptanceChecks: string[];
}

function scoreTone(score?: number): "ok" | "neutral" | "forge" {
  if (score === undefined) return "neutral";
  if (score >= 80) return "ok";
  if (score >= 60) return "forge";
  return "neutral";
}

export function ResultView({
  result,
  options,
  setOptions,
  onRegenerate,
  regenerating,
  onSaveTemplate,
  onToast,
  onBack,
}: {
  result: GenerateResult;
  options: GenerateOptions;
  setOptions: (o: Partial<GenerateOptions>) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  onSaveTemplate: (name: string) => void;
  onToast: (msg: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = React.useState("prompt");
  const [saving, setSaving] = React.useState(false);
  const [tplName, setTplName] = React.useState("");

  const current =
    tab === "sop"
      ? result.sop
      : tab === "built"
        ? builtSummary(result)
        : result.prompt;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current);
      onToast("Copied to clipboard.");
    } catch {
      onToast("Copy failed — select and copy manually.");
    }
  };

  const download = () => {
    const blob = new Blob([current], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promptforge-${tab}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onToast("File downloaded.");
  };

  const exportBundle = async (format: "pdf" | "docx") => {
    if (!result.generatedPromptId) {
      onToast("Generate a prompt first.");
      return;
    }
    try {
      const res = await fetch(`/api/export/${result.generatedPromptId}?format=${format}`);
      if (!res.ok) {
        onToast(`Export failed (${format}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promptforge-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onToast(`${format === "pdf" ? "PDF" : "Word document"} downloaded.`);
    } catch {
      onToast("Export failed — please try again.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* controls */}
      <aside className="flex h-fit flex-col gap-5 rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-20">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Provider</span>
          <Badge tone={/^(anthropic|cerebras)/.test(result.provider) ? "ok" : "neutral"}>
            {result.provider}
          </Badge>
        </div>
        {Array.isArray(result.meta?.reviewCouncil) && (
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Review council</span>
            <Badge tone="accent">
              {(result.meta.reviewCouncil as ReviewerReport[]).filter((r) => r.status === "completed").length}/4 agents completed
            </Badge>
          </div>
        )}
        {result.qualityScore !== undefined && (
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Quality score</span>
            <Badge tone={scoreTone(result.qualityScore)}>{result.qualityScore}/100</Badge>
          </div>
        )}
        {result.variantLabel && (
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Chosen from A/B</span>
            <Badge tone="accent">Variant {result.variantLabel}</Badge>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Verbosity</span>
          <Segmented
            options={[
              { value: "concise", label: "Concise" },
              { value: "balanced", label: "Balanced" },
              { value: "detailed", label: "Detailed" },
            ]}
            value={options.verbosity}
            onChange={(v) => v && setOptions({ verbosity: v as GenerateOptions["verbosity"] })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Rigour</span>
          <Segmented
            options={[
              { value: "guidance", label: "Guidance" },
              { value: "strict", label: "Strict" },
            ]}
            value={options.rigor}
            onChange={(v) => v && setOptions({ rigor: v as GenerateOptions["rigor"] })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="eyebrow">Refine</span>
          <Textarea
            placeholder="Extra instructions to weave in…"
            value={options.refine ?? ""}
            maxLength={2000}
            onChange={(e) => setOptions({ refine: e.target.value })}
          />
          <Button variant="forge" size="sm" onClick={onRegenerate} disabled={regenerating}>
            {regenerating ? <Spinner /> : null}
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
        </div>
      </aside>

      {/* output */}
      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <Tabs
          tabs={[
            { id: "prompt", label: "AI prompt" },
            { id: "sop", label: "SOP / briefing" },
            { id: "built", label: "How it was built" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <span className="mono text-[11px] tracking-wide text-ink3">
            {tab === "prompt"
              ? "READY-TO-PASTE ARTIFACT"
              : tab === "sop"
                ? "HUMAN BRIEFING DOCUMENT"
                : "ENGINEERING TRANSPARENCY"}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={copy}>
              Copy
            </Button>
            <Button size="sm" onClick={download}>
              Download .md
            </Button>
          </div>
        </div>
        <div className="scroll-thin max-h-[62vh] overflow-auto bg-sunken px-5 py-5">
          <pre className="mono whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink">
            {current}
          </pre>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <span className="eyebrow mr-1">Hand off</span>
          <HandoffPanel generatedPromptId={result.generatedPromptId} onToast={onToast} />
          <span className="eyebrow ml-3 mr-1">Export</span>
          <Button size="sm" onClick={() => exportBundle("pdf")} disabled={!result.generatedPromptId}>
            PDF
          </Button>
          <Button size="sm" onClick={() => exportBundle("docx")} disabled={!result.generatedPromptId}>
            Word
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          {!saving ? (
            <Button size="sm" onClick={() => setSaving(true)}>
              Save as template
            </Button>
          ) : (
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <input
                autoFocus
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Template name"
                maxLength={80}
                className="min-w-[180px] flex-1 rounded-lg border border-line2 bg-surface2 px-3 py-1.5 text-sm text-ink placeholder:text-ink3 focus:outline-none focus:border-accent focus:bg-surface"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!tplName.trim()) {
                    onToast("Please enter a template name.");
                    return;
                  }
                  onSaveTemplate(tplName.trim());
                  setSaving(false);
                  setTplName("");
                }}
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSaving(false)}>
                Cancel
              </Button>
            </div>
          )}
          <div className="ml-auto">
            <Button size="sm" variant="primary" onClick={onBack}>
              ← Edit inputs
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function builtSummary(result: GenerateResult): string {
  const s: string[] = [];
  s.push("# How this was built", "");
  s.push(`Provider: ${result.provider}`);
  s.push(`Technique: ${result.technique}`);
  s.push(`Patterns applied: ${result.patternsUsed.join(", ") || "—"}`);
  s.push(`Output format: ${result.outputFormat}`, "");

  const quality = result.meta?.quality as QualityReport | undefined;
  if (quality) {
    s.push(`## Quality report — ${quality.score}/100`, "");
    s.push(
      "Checked against the Google whitepaper checklist (task, context, format, constraints, technique, simplicity) plus an examples bonus.",
      "",
    );
    for (const c of quality.criteria) {
      s.push(`${c.passed ? "✓" : "✗"} ${c.label} (${c.weight}) — ${c.note}`);
    }
    s.push(
      "",
      quality.repairedBy === "none"
        ? "No repair was needed — every required check passed on the first pass."
        : quality.repairedBy === "local"
          ? "Repaired locally: a mechanical quality note was appended for the checks that came up weak (no API key configured, so nothing was rewritten or invented)."
          : `Repaired by ${quality.repairedBy}: the model re-verified the checklist against the actual prompt text and rewrote the weak sections without inventing new facts.`,
    );
    s.push("");
  }

  const council = result.meta?.reviewCouncil as ReviewerReport[] | undefined;
  if (Array.isArray(council)) {
    s.push("## Independent review council", "");
    for (const reviewer of council) {
      s.push(`### ${reviewer.label} — ${reviewer.status}`);
      s.push(reviewer.summary || "No summary returned.");
      for (const finding of reviewer.findings ?? []) {
        s.push(`- [${finding.severity.toUpperCase()}] ${finding.finding} → ${finding.recommendation}`);
      }
      if (reviewer.missingRequirements?.length) {
        s.push("Missing requirements:", ...reviewer.missingRequirements.map((item) => `- ${item}`));
      }
      if (reviewer.acceptanceChecks?.length) {
        s.push("Acceptance checks:", ...reviewer.acceptanceChecks.map((item) => `- ${item}`));
      }
      s.push("");
    }
  }

  const sys = result.meta?.systemMetaPrompt as string | undefined;
  if (sys) {
    s.push("## System meta-prompt sent to the model", "", sys);
  } else {
    s.push(
      "## Assembly",
      "",
      "This artifact was assembled deterministically by PromptForge's built-in engine using the Google whitepaper building blocks (role, task, context, format, technique) and the Vanderbilt prompt patterns above.",
      "",
      "Add ANTHROPIC_API_KEY to run the four independent reviewers and have Claude synthesize and quality-gate the final artifact.",
    );
  }
  return s.join("\n");
}
