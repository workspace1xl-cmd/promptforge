// Server-only AI layer. Claude is the primary provider and runs an independent
// four-reviewer council before synthesising the final artifact. Cerebras remains
// a compatible secondary provider; the deterministic engine is the final fallback.

import type {
  Answers,
  ComplianceRuleDef,
  DepartmentConfig,
  GenerateOptions,
} from "@/lib/departments/types";
import {
  buildModel,
  buildStructuredInput,
  buildSystemMetaPrompt,
  renderPrompt,
  renderSOP,
  type MetaModel,
} from "./assemble";
import { anthropicModel, callAnthropic } from "./anthropic";
import { localReviewCouncil, runReviewCouncil } from "./review-council";

export interface EngineResult {
  prompt: string;
  sop: string;
  technique: string;
  patternsUsed: string[];
  provider: string;
  meta: Record<string, unknown>;
  /** The assembled model — reused by the critique pass so it isn't rebuilt. */
  model: MetaModel;
}

async function callCerebras(
  system: string,
  user: string,
  apiKey: string,
): Promise<string> {
  const base = process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1";
  const model = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    }),
    // Without a timeout, a hung Cerebras connection would stall the request
    // indefinitely — the local-engine fallback only helps if this call is
    // guaranteed to eventually fail.
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cerebras request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function generate(
  config: DepartmentConfig,
  answers: Answers,
  compliance: ComplianceRuleDef[],
  options: GenerateOptions,
): Promise<EngineResult> {
  const model = buildModel(config, answers, compliance, options);
  const sop = renderSOP(model);
  const baseMeta = {
    technique: model.technique,
    patternsUsed: model.patternsUsed,
    outputFormat: model.outputFormatLabel,
  };

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey?.trim()) {
    try {
      const system = [
        buildSystemMetaPrompt(model, options),
        "Before writing, use the independent council reports in the input as review evidence.",
        "For software work, the artifact must be executable by the selected coding agent and include: requirement audit; assumptions versus unresolved questions; repository discovery; ordered phases with an objective, concrete tasks and verification for each phase; edge and failure cases; security/privacy/accessibility/performance checks where relevant; complete acceptance criteria; final end-to-end verification; deployment, observability and rollback guidance.",
        "Do not claim that tests passed or files were inspected. Instruct the coding agent to inspect and verify them.",
        "If essential information is missing, mark it as an explicit question or safe assumption instead of inventing it.",
      ].join("\n");
      const structured = buildStructuredInput(model);
      const reviewCouncil = await runReviewCouncil(structured, anthropicKey);
      const user = `${structured}\n\nINDEPENDENT REVIEW COUNCIL REPORTS:\n${JSON.stringify(reviewCouncil, null, 2)}`;
      const text = await callAnthropic({
        system,
        user,
        apiKey: anthropicKey,
        maxTokens: options.verbosity === "detailed" ? 8000 : 6000,
        temperature: 0.25,
      });
      if (text) {
        return {
          prompt: text,
          sop,
          technique: model.technique,
          patternsUsed: [...model.patternsUsed, "multi-agent-review"],
          provider: `anthropic:${anthropicModel()}`,
          meta: { ...baseMeta, systemMetaPrompt: system, reviewCouncil },
          model,
        };
      }
    } catch (err) {
      return {
        prompt: renderPrompt(model, options),
        sop,
        technique: model.technique,
        patternsUsed: model.patternsUsed,
        provider: "local-engine (Claude provider error)",
        meta: {
          ...baseMeta,
          providerError: (err as Error).message,
          reviewCouncil: localReviewCouncil(),
        },
        model,
      };
    }
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (apiKey && apiKey.trim()) {
    try {
      const system = buildSystemMetaPrompt(model, options);
      const input = buildStructuredInput(model);
      const text = await callCerebras(system, input, apiKey);
      if (text && text.trim()) {
        const modelName = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
        return {
          prompt: text.trim(),
          sop,
          technique: model.technique,
          patternsUsed: model.patternsUsed,
          provider: `cerebras:${modelName}`,
          meta: { ...baseMeta, systemMetaPrompt: system },
          model,
        };
      }
    } catch (err) {
      // Fall back to the local engine on any provider error.
      return {
        prompt: renderPrompt(model, options),
        sop,
        technique: model.technique,
        patternsUsed: model.patternsUsed,
        provider: "local-engine (provider error)",
        meta: { ...baseMeta, providerError: (err as Error).message },
        model,
      };
    }
  }

  return {
    prompt: renderPrompt(model, options),
    sop,
    technique: model.technique,
    patternsUsed: model.patternsUsed,
    provider: "local-engine",
    meta: { ...baseMeta, reviewCouncil: localReviewCouncil() },
    model,
  };
}
