"use client";

import * as React from "react";
import { Button, Textarea } from "@/components/ui";
import type { ClarifyQuestion } from "@/lib/engine/clarify";

export function ClarifyPanel({
  questions,
  busy,
  onContinue,
  onSkip,
}: {
  questions: ClarifyQuestion[];
  busy: boolean;
  onContinue: (answers: { question: string; answer: string }[]) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-sm">
      <div className="eyebrow">Quick check before forging</div>
      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
        A couple of things would sharpen this
      </h2>
      <p className="mt-1 text-[13.5px] text-ink2">
        This brief is a little thin in a few spots. Answer what you can — or skip
        straight to forging and PromptForge will use sensible defaults.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {questions.map((q) => (
          <div key={q.fieldId} className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-ink">{q.question}</label>
            <Textarea
              value={answers[q.fieldId] ?? ""}
              maxLength={800}
              placeholder="Optional — leave blank to skip this one"
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.fieldId]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-line pt-5">
        <Button variant="ghost" onClick={onSkip} disabled={busy}>
          Skip &amp; forge anyway
        </Button>
        <Button
          variant="forge"
          disabled={busy}
          onClick={() =>
            onContinue(
              questions
                .map((q) => ({ question: q.question, answer: (answers[q.fieldId] ?? "").trim() }))
                .filter((a) => a.answer.length > 0),
            )
          }
        >
          {busy ? "Forging…" : "Continue →"}
        </Button>
      </div>
    </div>
  );
}
