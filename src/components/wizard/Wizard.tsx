"use client";

import * as React from "react";
import type {
  Answers,
  AnswerValue,
  ComplianceRuleDef,
  DepartmentConfig,
  GenerateOptions,
} from "@/lib/departments/types";
import { allFields, hasValue, isFieldVisible } from "@/lib/engine/assemble";
import { FieldRenderer } from "./FieldRenderer";
import { LivePreview } from "./LivePreview";
import { ResultView, type GenerateResult } from "./ResultView";
import { Button, Progress, Segmented } from "@/components/ui";
import { cn } from "@/lib/utils";

function initialAnswers(config: DepartmentConfig): Answers {
  const a: Answers = {};
  for (const f of allFields(config)) if (f.default !== undefined) a[f.id] = f.default;
  return a;
}

export function Wizard({
  config,
  compliance,
  departmentKey,
}: {
  config: DepartmentConfig;
  compliance: ComplianceRuleDef[];
  departmentKey: string;
}) {
  const outputStep = config.steps.length;
  const totalSteps = config.steps.length + 1;

  const [answers, setAnswers] = React.useState<Answers>(() => initialAnswers(config));
  const [step, setStep] = React.useState(0);
  const [outputFormat, setOutputFormat] = React.useState(config.defaultOutputFormat);
  const [verbosity, setVerbosity] = React.useState<GenerateOptions["verbosity"]>("balanced");
  const [rigor, setRigor] = React.useState<GenerateOptions["rigor"]>("guidance");
  const [refine, setRefine] = React.useState("");
  const [errors, setErrors] = React.useState<Set<string>>(new Set());
  const [result, setResult] = React.useState<GenerateResult | null>(null);
  const [submissionId, setSubmissionId] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const options: GenerateOptions = {
    useCase: (answers.useCase as string) || config.useCases[0]?.id || "",
    outputFormat,
    verbosity,
    rigor,
    refine,
  };

  const setAnswer = (id: string, v: AnswerValue) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (v === undefined || (Array.isArray(v) && v.length === 0)) delete next[id];
      else next[id] = v;
      return next;
    });
    setErrors((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const stepFieldsMissing = (i: number) => {
    const s = config.steps[i];
    if (!s) return [];
    return s.fields.filter(
      (f) => f.required && isFieldVisible(f, answers) && !hasValue(answers[f.id]),
    );
  };

  const next = () => {
    if (step < outputStep) {
      const missing = stepFieldsMissing(step);
      if (missing.length) {
        setErrors(new Set(missing.map((f) => f.id)));
        showToast("Please complete the required fields.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, outputStep));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const goToStep = (i: number) => {
    if (i <= step) setStep(i);
  };

  async function runGenerate(reuseSubmission: boolean) {
    // validate every required visible field across all steps
    const missing = allFields(config).filter(
      (f) => f.required && isFieldVisible(f, answers) && !hasValue(answers[f.id]),
    );
    if (missing.length) {
      setErrors(new Set(missing.map((f) => f.id)));
      // jump to the step of the first missing field
      const firstId = missing[0].id;
      const idx = config.steps.findIndex((s) => s.fields.some((f) => f.id === firstId));
      if (idx >= 0) setStep(idx);
      showToast("Please complete the required fields.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentKey,
          useCase: options.useCase,
          outputFormat,
          verbosity,
          rigor,
          refine,
          answers,
          submissionId: reuseSubmission ? submissionId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data?.error ?? "Generation failed.");
        return;
      }
      setResult(data);
      setSubmissionId(data.submissionId ?? null);
      showToast(reuseSubmission ? "Regenerated." : "Prompt generated.");
    } catch {
      showToast("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function saveTemplate(name: string) {
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departmentKey, useCase: options.useCase, answers, name }),
      });
      if (!res.ok) {
        showToast("Could not save the template.");
        return;
      }
      showToast("Template saved.");
    } catch {
      showToast("Could not save the template.");
    }
  }

  const progress = (Math.min(step, outputStep) / (totalSteps - 1)) * 100;

  return (
    <div className="relative">
      {/* stepper */}
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {[...config.steps.map((s) => s.title), "Output"].map((title, i) => {
            const state = i === step ? "current" : i < step ? "done" : "todo";
            return (
              <button
                key={title}
                type="button"
                onClick={() => goToStep(i)}
                disabled={i > step}
                className={cn(
                  "flex items-center gap-2 text-[13px] font-semibold transition-colors",
                  state === "current" && "text-ink",
                  state === "done" && "text-ink2 hover:text-ink cursor-pointer",
                  state === "todo" && "text-ink3 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded-full mono text-[10px]",
                    state === "current" && "bg-accent text-accent-fg",
                    state === "done" && "bg-accent-soft text-accent",
                    state === "todo" && "border border-line2 text-ink3",
                  )}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                {title}
              </button>
            );
          })}
        </div>
        <Progress value={progress} />
      </div>

      {result ? (
        <ResultView
          result={result}
          options={options}
          setOptions={(o) => {
            if (o.verbosity) setVerbosity(o.verbosity);
            if (o.rigor) setRigor(o.rigor);
            if (o.refine !== undefined) setRefine(o.refine);
            if (o.outputFormat) setOutputFormat(o.outputFormat);
          }}
          onRegenerate={() => runGenerate(true)}
          regenerating={generating}
          onSaveTemplate={saveTemplate}
          onToast={showToast}
          onBack={() => setResult(null)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* form */}
          <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
            {step < outputStep ? (
              <>
                <div className="mb-5 border-b border-dashed border-line pb-4">
                  <div className="eyebrow">
                    Step {step + 1} of {totalSteps}
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
                    {config.steps[step].title}
                  </h2>
                  {config.steps[step].description && (
                    <p className="mt-0.5 text-[13.5px] text-ink2">
                      {config.steps[step].description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-5">
                  {config.steps[step].fields
                    .filter((f) => isFieldVisible(f, answers))
                    .map((f) => (
                      <FieldRenderer
                        key={f.id}
                        field={f}
                        value={answers[f.id]}
                        onChange={(v) => setAnswer(f.id, v)}
                        invalid={errors.has(f.id)}
                      />
                    ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-5 border-b border-dashed border-line pb-4">
                  <div className="eyebrow">
                    Step {totalSteps} of {totalSteps}
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
                    Output
                  </h2>
                  <p className="mt-0.5 text-[13.5px] text-ink2">
                    Choose the artifact and how it should read, then forge it.
                  </p>
                </div>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold text-ink">Desired output</span>
                    <Segmented
                      options={config.outputFormats}
                      value={outputFormat}
                      onChange={(v) => v && setOutputFormat(v)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold text-ink">Verbosity</span>
                    <Segmented
                      options={[
                        { value: "concise", label: "Concise" },
                        { value: "balanced", label: "Balanced" },
                        { value: "detailed", label: "Detailed" },
                      ]}
                      value={verbosity}
                      onChange={(v) => v && setVerbosity(v as GenerateOptions["verbosity"])}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] font-semibold text-ink">Rigour</span>
                    <Segmented
                      options={[
                        { value: "guidance", label: "Guidance" },
                        { value: "strict", label: "Strict" },
                      ]}
                      value={rigor}
                      onChange={(v) => v && setRigor(v as GenerateOptions["rigor"])}
                    />
                  </div>
                </div>
              </>
            )}

            {/* nav */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-line pt-5">
              <Button variant="ghost" onClick={back} disabled={step === 0}>
                ← Back
              </Button>
              {step < outputStep ? (
                <Button variant="primary" onClick={next}>
                  Next →
                </Button>
              ) : (
                <Button variant="forge" onClick={() => runGenerate(false)} disabled={generating}>
                  {generating ? "Forging…" : "Forge output →"}
                </Button>
              )}
            </div>
          </div>

          {/* live preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <LivePreview
              config={config}
              answers={answers}
              compliance={compliance}
              options={options}
            />
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
