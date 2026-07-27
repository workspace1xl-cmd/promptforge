// The meta-prompt engine. Pure/isomorphic: the same code powers the live
// preview in the browser and the final generation on the server. It encodes the
// Google whitepaper building blocks (task, context, format, technique) and the
// Vanderbilt prompt patterns.

import type {
  Answers,
  ComplianceRuleDef,
  DepartmentConfig,
  FieldDef,
  GenerateOptions,
} from "@/lib/departments/types";
import {
  PATTERN_MAP,
  TECHNIQUE_INSTRUCTIONS,
  type Technique,
} from "./patterns";

export interface MetaModel {
  persona: string;
  departmentName: string;
  useCaseName: string;
  taskLead: string;
  task: string[];
  context: string[];
  audience: string[];
  constraints: string[];
  compliance: string[];
  formatNotes: string[];
  examples: string[];
  outputFormatLabel: string;
  outputFormatInstruction: string;
  technique: Technique;
  patternsUsed: string[];
}

/* ---------- value helpers ---------- */

export function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

function renderValue(v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function isFieldVisible(field: FieldDef, answers: Answers): boolean {
  if (!field.showIf) return true;
  const cur = answers[field.showIf.field];
  if ("equals" in field.showIf && field.showIf.equals !== undefined)
    return cur === field.showIf.equals;
  if (field.showIf.in) return Array.isArray(cur)
    ? cur.some((c) => field.showIf!.in!.includes(String(c)))
    : field.showIf.in.includes(String(cur));
  if (field.showIf.truthy) return hasValue(cur);
  return true;
}

export function allFields(config: DepartmentConfig): FieldDef[] {
  return config.steps.flatMap((s) => s.fields);
}

/* ---------- technique selection (Google whitepaper) ---------- */

function outputFormatLabel(config: DepartmentConfig, value: string): string {
  return config.outputFormats.find((o) => o.value === value)?.label ?? value;
}

// Config-driven: the instruction lives on the department's output-format option.
function outputFormatInstruction(
  config: DepartmentConfig,
  value: string,
  label: string,
): string {
  return (
    config.outputFormats.find((o) => o.value === value)?.instruction ??
    `Format the result as: ${label}.`
  );
}

function selectTechnique(
  answers: Answers,
  config: DepartmentConfig,
  options: GenerateOptions,
  hasExamples: boolean,
): Technique {
  // The A/B variant generator forces a deliberately different technique for
  // variant B — that always wins over the normal selection heuristic.
  if (options.techniqueOverride) return options.techniqueOverride;
  if (hasExamples) return "few-shot";
  // A department can pin a preferred technique to a given output artifact.
  const def = config.outputFormats.find((o) => o.value === options.outputFormat);
  if (def?.technique) return def.technique;
  // Otherwise: many filled fields → reason first.
  const filled = allFields(config).filter(
    (f) => isFieldVisible(f, answers) && hasValue(answers[f.id]),
  ).length;
  if (filled >= 8) return "chain-of-thought";
  return "zero-shot";
}

/* ---------- model assembly ---------- */

export function buildModel(
  config: DepartmentConfig,
  answers: Answers,
  compliance: ComplianceRuleDef[],
  options: GenerateOptions,
): MetaModel {
  const task: string[] = [];
  const context: string[] = [];
  const audience: string[] = [];
  const constraints: string[] = [];
  const formatNotes: string[] = [];
  const examples: string[] = [];

  for (const field of allFields(config)) {
    // "useCase" is a meta field — it selects the use case, not prompt content.
    if (field.id === "useCase") continue;
    if (!isFieldVisible(field, answers)) continue;
    const v = answers[field.id];
    if (!hasValue(v)) continue;
    const line = `${field.label}: ${renderValue(v)}`;
    switch (field.slot) {
      case "task":
        task.push(line);
        break;
      case "context":
      case "persona":
        context.push(line);
        break;
      case "audience":
        audience.push(line);
        break;
      case "constraint":
        constraints.push(line);
        break;
      case "format":
        formatNotes.push(line);
        break;
      case "example":
        examples.push(renderValue(v));
        break;
    }
  }

  // Answers to the pre-generation clarify step read straight into context —
  // they exist specifically to fill the gaps a thin brief left behind.
  for (const c of options.clarifications ?? []) {
    if (c.answer && c.answer.trim()) context.push(`${c.question}: ${c.answer.trim()}`);
  }

  const hard = compliance.filter((c) => (c.severity ?? "hard") === "hard");
  const complianceLines = hard.map((c) => `${c.label} — ${c.description}`);

  const useCaseName =
    config.useCases.find((u) => u.id === options.useCase)?.name ??
    config.useCases[0]?.name ??
    config.name;

  const label = outputFormatLabel(config, options.outputFormat);
  const technique = selectTechnique(answers, config, options, examples.length > 0);

  const patternsUsed = Array.from(
    new Set([
      ...config.patterns,
      ...(examples.length ? ["few-shot"] : []),
      ...(technique === "chain-of-thought" ? ["chain-of-thought"] : []),
    ]),
  );

  return {
    persona: config.persona,
    departmentName: config.name,
    useCaseName,
    taskLead: `Produce ${label.toLowerCase()} for the following ${useCaseName.toLowerCase()} task.`,
    task,
    context,
    audience,
    constraints,
    compliance: complianceLines,
    formatNotes,
    examples,
    outputFormatLabel: label,
    outputFormatInstruction: outputFormatInstruction(config, options.outputFormat, label),
    technique,
    patternsUsed,
  };
}

/* ---------- renderers ---------- */

const bullets = (arr: string[]) => arr.map((x) => `- ${x}`).join("\n");

function approachLines(model: MetaModel, options: GenerateOptions): string[] {
  const lines: string[] = [];
  for (const key of model.patternsUsed) {
    const inst = PATTERN_MAP[key]?.instruction;
    if (inst) lines.push(inst);
  }
  lines.push(TECHNIQUE_INSTRUCTIONS[model.technique]);
  if (options.verbosity === "concise")
    lines.push("Be concise. Cut any preamble or filler.");
  else if (options.verbosity === "detailed")
    lines.push("Be thorough and explain the reasoning behind key choices.");
  lines.push(
    options.rigor === "strict"
      ? "Follow these instructions exactly. If a required detail is missing, ask before proceeding rather than inventing it."
      : "Use sensible engineering judgement to fill small gaps.",
  );
  lines.push(
    "Design with simplicity: keep the result as concise as the task allows.",
  );
  return Array.from(new Set(lines));
}

/** The final artifact produced by the local (deterministic) engine. */
export function renderPrompt(model: MetaModel, options: GenerateOptions): string {
  const s: string[] = [];
  s.push("# ROLE", `You are ${model.persona}.`);
  s.push("", "# OBJECTIVE", model.taskLead);
  if (model.task.length) s.push(bullets(model.task));

  const ctx = [...model.context, ...model.audience.map((a) => a)];
  if (ctx.length) s.push("", "# CONTEXT", bullets(ctx));

  const allConstraints = [...model.compliance, ...model.constraints];
  if (allConstraints.length)
    s.push(
      "",
      "# CONSTRAINTS — hard requirements, do not violate",
      bullets(allConstraints),
    );

  s.push("", "# OUTPUT FORMAT", model.outputFormatInstruction);
  if (model.formatNotes.length) s.push(bullets(model.formatNotes));

  if (model.examples.length) {
    s.push("", "# EXAMPLES");
    for (const ex of model.examples) s.push("```", ex, "```");
  }

  s.push("", "# HOW TO APPROACH IT", bullets(approachLines(model, options)));

  if (options.refine && options.refine.trim())
    s.push("", "# ADDITIONAL INSTRUCTIONS", options.refine.trim());

  return s.join("\n");
}

/** A human-readable briefing document (SOP). */
export function renderSOP(model: MetaModel): string {
  const s: string[] = [];
  s.push(`# ${model.useCaseName} — Engineering Brief`);
  s.push(`_Department: ${model.departmentName} · Prepared with PromptForge_`, "");
  s.push("## Objective", model.taskLead);
  if (model.task.length) s.push(bullets(model.task));
  const ctx = [...model.context, ...model.audience];
  s.push("", "## Context", ctx.length ? bullets(ctx) : "- None provided.");
  s.push("", "## Deliverable", `- ${model.outputFormatLabel}`, `- ${model.outputFormatInstruction}`);
  const cons = [...model.compliance, ...model.constraints];
  s.push("", "## Constraints & compliance", cons.length ? bullets(cons) : "- None specified.");
  s.push(
    "",
    "## Definition of done",
    "- Meets the objective and every constraint above.",
    "- Follows the team's coding standards and compliance rules.",
    "- Ready to use with no rework.",
  );
  return s.join("\n");
}

/** System prompt sent to the LLM when a real provider is configured. */
export function buildSystemMetaPrompt(
  model: MetaModel,
  options: GenerateOptions,
): string {
  const patterns = model.patternsUsed
    .map((k) => PATTERN_MAP[k]?.name ?? k)
    .join(", ");
  return [
    "You are an expert prompt engineer.",
    "Using Google's prompt-engineering best practices (clear task, context, output format, technique selection) and Vanderbilt's prompt-pattern catalog, assemble ONE production-ready artifact from the structured input below.",
    `Desired artifact: ${model.outputFormatLabel}.`,
    `Use the ${model.technique} technique.`,
    patterns ? `Apply these patterns: ${patterns}.` : "",
    "Treat every listed compliance rule as a hard constraint.",
    "Design with simplicity — keep the result concise and free of filler.",
    options.rigor === "strict"
      ? "Do not invent missing details; if something required is absent, note it explicitly."
      : "",
    "Output ONLY the final artifact in the requested format — no preamble, no explanation, no markdown fences around the whole thing.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Structured input (the user message) sent alongside the system meta-prompt. */
export function buildStructuredInput(model: MetaModel): string {
  const payload = {
    department: model.departmentName,
    useCase: model.useCaseName,
    persona: model.persona,
    objective: model.taskLead,
    taskDetails: model.task,
    context: model.context,
    audience: model.audience,
    constraints: model.constraints,
    complianceRules: model.compliance,
    outputFormat: model.outputFormatLabel,
    outputFormatSpec: model.outputFormatInstruction,
    examples: model.examples,
    technique: model.technique,
  };
  return JSON.stringify(payload, null, 2);
}

/** Which of the seven framework parts are populated (for the live preview). */
export function frameworkParts(model: MetaModel): { name: string; filled: boolean }[] {
  return [
    { name: "Role", filled: true },
    // Task is always considered filled — the objective line (taskLead) is
    // present regardless of whether any task-slotted field was answered.
    { name: "Task", filled: true },
    { name: "Context", filled: model.context.length + model.audience.length > 0 },
    {
      name: "Constraints",
      filled: model.compliance.length + model.constraints.length > 0,
    },
    { name: "Format", filled: true },
    { name: "Examples", filled: model.examples.length > 0 },
    { name: "Technique", filled: true },
  ];
}

/** Convenience wrapper: build + render everything the local engine produces. */
export function assembleLocal(
  config: DepartmentConfig,
  answers: Answers,
  compliance: ComplianceRuleDef[],
  options: GenerateOptions,
) {
  const model = buildModel(config, answers, compliance, options);
  return {
    model,
    prompt: renderPrompt(model, options),
    sop: renderSOP(model),
    technique: model.technique,
    patternsUsed: model.patternsUsed,
  };
}
