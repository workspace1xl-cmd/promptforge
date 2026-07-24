"use client";

import { Badge, Button } from "@/components/ui";
import type { GenerateResult } from "./ResultView";

export interface VariantResult extends GenerateResult {
  label: "A" | "B";
  qualityScore?: number;
}

function scoreTone(score?: number): "ok" | "neutral" | "forge" {
  if (score === undefined) return "neutral";
  if (score >= 80) return "ok";
  if (score >= 60) return "forge";
  return "neutral";
}

export function VariantPicker({
  variants,
  onPick,
  onBack,
}: {
  variants: VariantResult[];
  onPick: (v: VariantResult) => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-5">
        <div className="eyebrow">Two takes on the same brief</div>
        <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
          Compare and pick one
        </h2>
        <p className="mt-1 text-[13.5px] text-ink2">
          Variant B deliberately uses a different technique and rigour so the two are
          genuinely different, not just reworded.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {variants.map((v) => (
          <div key={v.label} className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Badge tone="accent">Variant {v.label}</Badge>
              <Badge tone="forge">{v.technique}</Badge>
              {v.qualityScore !== undefined && (
                <Badge tone={scoreTone(v.qualityScore)} className="ml-auto">
                  Quality {v.qualityScore}/100
                </Badge>
              )}
            </div>
            <div className="scroll-thin max-h-[42vh] overflow-auto bg-sunken px-4 py-4">
              <pre className="mono whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-ink">
                {v.prompt}
              </pre>
            </div>
            <div className="border-t border-line p-3">
              <Button variant="forge" size="sm" className="w-full" onClick={() => onPick(v)}>
                Use variant {v.label} →
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Button variant="ghost" onClick={onBack}>
          ← Edit inputs
        </Button>
      </div>
    </div>
  );
}
