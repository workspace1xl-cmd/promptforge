"use client";

import * as React from "react";
import type {
  Answers,
  ComplianceRuleDef,
  DepartmentConfig,
  GenerateOptions,
} from "@/lib/departments/types";
import { assembleLocal, frameworkParts } from "@/lib/engine/assemble";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

export function LivePreview({
  config,
  answers,
  compliance,
  options,
}: {
  config: DepartmentConfig;
  answers: Answers;
  compliance: ComplianceRuleDef[];
  options: GenerateOptions;
}) {
  const { model, prompt } = React.useMemo(
    () => assembleLocal(config, answers, compliance, options),
    [config, answers, compliance, options],
  );
  const parts = frameworkParts(model);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Live meta-prompt</span>
          <Badge tone="forge">{model.technique}</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1.5">
          {parts.map((p) => (
            <span
              key={p.name}
              className={cn(
                "inline-flex items-center gap-1.5 mono text-[10.5px] tracking-wide",
                p.filled ? "text-ink" : "text-ink3",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  p.filled ? "bg-accent" : "bg-line2",
                )}
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <div
        className="scroll-thin max-h-[58vh] overflow-auto px-4 py-4"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--ink3) 20%, transparent) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      >
        <pre className="mono whitespace-pre-wrap break-words text-[12px] leading-relaxed text-ink">
          {prompt}
        </pre>
      </div>

      <div className="border-t border-line px-4 py-2.5 text-[11px] leading-snug text-ink3">
        Assembled live from Role · Task · Context · Constraints · Format · Examples ·
        Technique. Patterns: {model.patternsUsed.join(", ") || "—"}.
      </div>
    </div>
  );
}
