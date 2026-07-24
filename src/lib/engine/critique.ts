// The quality layer. Scores every generated artifact against the Google
// whitepaper checklist (clear task, context, format, constraints, technique,
// simplicity — examples as a bonus), then repairs weak spots: mechanically
// via a fixed hint when no AI key is configured, or via a second Cerebras
// call that re-verifies the checklist against the real prompt text and
// rewrites it without inventing facts.

import type { GenerateOptions } from "@/lib/departments/types";
import type { MetaModel } from "./assemble";

export interface QualityCriterion {
  key: string;
  label: string;
  passed: boolean;
  note: string;
  weight: "required" | "bonus";
}

export interface QualityReport {
  score: number; // 0-100
  criteria: QualityCriterion[];
  repairedPrompt: string;
  repairedBy: "none" | "local" | string; // "cerebras:<model>" when the LLM repaired it
}

const REPAIR_HINTS: Record<string, string> = {
  context:
    "No additional context was provided — state your assumptions explicitly and flag anything you're unsure about.",
  simplicity:
    "This brief is longer than ideal for the requested verbosity — prioritise the most essential points first.",
};

function scoreCriteria(
  model: MetaModel,
  prompt: string,
  options: GenerateOptions,
): QualityCriterion[] {
  const criteria: QualityCriterion[] = [];

  criteria.push({
    key: "role",
    label: "Persona / role framing",
    weight: "required",
    passed: model.persona.trim().length > 0,
    note: "A specific persona is set for every generation.",
  });

  criteria.push({
    key: "task",
    label: "Clear task definition",
    weight: "required",
    passed: model.task.length > 0,
    note:
      model.task.length > 0
        ? `${model.task.length} task detail(s) captured from the form.`
        : "No task-specific details were captured beyond the objective line.",
  });

  const contextCount = model.context.length + model.audience.length;
  criteria.push({
    key: "context",
    label: "Context provided",
    weight: "required",
    passed: contextCount > 0,
    note:
      contextCount > 0
        ? `${contextCount} context line(s) grounding the task.`
        : "No background context was provided.",
  });

  criteria.push({
    key: "format",
    label: "Output format specified",
    weight: "required",
    passed: true,
    note: `Format instruction set: "${model.outputFormatLabel}".`,
  });

  const constraintCount = model.compliance.length + model.constraints.length;
  criteria.push({
    key: "constraints",
    label: "Constraints enforced",
    weight: "required",
    passed: constraintCount > 0,
    note:
      constraintCount > 0
        ? `${constraintCount} hard constraint(s) will be enforced.`
        : "No constraints are being enforced.",
  });

  criteria.push({
    key: "examples",
    label: "Few-shot example",
    weight: "bonus",
    passed: model.examples.length > 0,
    note: model.examples.length > 0 ? "A reference example is included." : "Optional — none provided.",
  });

  criteria.push({
    key: "technique",
    label: "Technique selection",
    weight: "required",
    passed: true,
    note: `"${model.technique}" selected for this task.`,
  });

  const limit =
    options.verbosity === "concise" ? 1600 : options.verbosity === "balanced" ? 2600 : Infinity;
  const simplicityOk = prompt.length <= limit;
  criteria.push({
    key: "simplicity",
    label: "Design with simplicity",
    weight: "required",
    passed: simplicityOk,
    note: simplicityOk
      ? `${prompt.length} characters — within range for "${options.verbosity}".`
      : `${prompt.length} characters — longer than ideal for "${options.verbosity}".`,
  });

  return criteria;
}

function computeScore(criteria: QualityCriterion[]): number {
  const required = criteria.filter((c) => c.weight === "required");
  const bonus = criteria.filter((c) => c.weight === "bonus");
  const reqScore = required.length
    ? (required.filter((c) => c.passed).length / required.length) * 90
    : 90;
  const bonusScore = bonus.length
    ? (bonus.filter((c) => c.passed).length / bonus.length) * 10
    : 0;
  return Math.round(reqScore + bonusScore);
}

/** No-key fallback: a mechanical, non-inventive nudge appended for real gaps. */
function localRepair(
  prompt: string,
  criteria: QualityCriterion[],
): { prompt: string; repaired: boolean } {
  const hints = criteria
    .filter((c) => !c.passed && c.weight === "required" && REPAIR_HINTS[c.key])
    .map((c) => `- ${REPAIR_HINTS[c.key]}`);
  if (!hints.length) return { prompt, repaired: false };
  return {
    prompt: `${prompt}\n\n# QUALITY NOTES (auto-added)\n${hints.join("\n")}`,
    repaired: true,
  };
}

async function cerebrasCritique(
  prompt: string,
  criteria: QualityCriterion[],
  apiKey: string,
): Promise<{ criteria: QualityCriterion[]; repairedPrompt: string } | null> {
  const base = process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1";
  const modelName = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
  const checklist = criteria
    .map(
      (c) =>
        `- ${c.key} (${c.weight}): ${c.label} — currently ${c.passed ? "PASS" : "WEAK"}: ${c.note}`,
    )
    .join("\n");
  const system = [
    "You are a rigorous prompt-engineering reviewer applying the Google Prompt Engineering whitepaper checklist.",
    "You are given a checklist with a first-pass verdict per item, and the full prompt text.",
    "Re-verify each checklist item against the ACTUAL prompt text below, then rewrite the prompt to fix any WEAK required item — without inventing facts, constraints or examples that were not already present.",
    "Preserve every fact, constraint and requirement already in the prompt; only strengthen structure and clarity.",
    'Respond with ONLY minified JSON, no prose, no markdown fence: {"criteria":[{"key":string,"passed":boolean,"note":string}],"repairedPrompt":string}',
  ].join("\n");
  const user = `CHECKLIST:\n${checklist}\n\nPROMPT:\n${prompt}`;

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as { criteria?: unknown; repairedPrompt?: unknown };
    if (
      !Array.isArray(parsed.criteria) ||
      typeof parsed.repairedPrompt !== "string" ||
      !parsed.repairedPrompt.trim()
    ) {
      return null;
    }

    const byKey = new Map(
      (parsed.criteria as { key?: string; passed?: boolean; note?: string }[])
        .filter((c) => c && typeof c.key === "string")
        .map((c) => [c.key as string, c]),
    );
    const merged = criteria.map((c) => {
      const llm = byKey.get(c.key);
      if (!llm || typeof llm.passed !== "boolean") return c;
      return {
        ...c,
        passed: llm.passed,
        note: typeof llm.note === "string" && llm.note.trim() ? llm.note.trim() : c.note,
      };
    });
    return { criteria: merged, repairedPrompt: parsed.repairedPrompt.trim() };
  } catch {
    return null;
  }
}

/** Score the artifact and repair it. Never throws — always returns a usable report. */
export async function critique(
  model: MetaModel,
  prompt: string,
  options: GenerateOptions,
): Promise<QualityReport> {
  const baseCriteria = scoreCriteria(model, prompt, options);
  const apiKey = process.env.CEREBRAS_API_KEY;

  if (apiKey && apiKey.trim()) {
    const modelName = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
    const result = await cerebrasCritique(prompt, baseCriteria, apiKey);
    if (result) {
      return {
        score: computeScore(result.criteria),
        criteria: result.criteria,
        repairedPrompt: result.repairedPrompt,
        repairedBy: `cerebras:${modelName}`,
      };
    }
    // Cerebras critique failed or returned unusable JSON — fall through to the
    // local pass so generation still returns a scored, usable artifact.
  }

  const { prompt: repairedPrompt, repaired } = localRepair(prompt, baseCriteria);
  return {
    score: computeScore(baseCriteria),
    criteria: baseCriteria,
    repairedPrompt,
    repairedBy: repaired ? "local" : "none",
  };
}
