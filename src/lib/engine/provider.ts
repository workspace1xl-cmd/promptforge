// Server-only AI layer. If CEREBRAS_API_KEY is set, the assembled meta-prompt is
// crafted by Cerebras (gpt-oss-120b) via its OpenAI-compatible API. Otherwise the
// deterministic local engine produces the artifact, so the app works end-to-end
// with no key. Same interface either way.

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
    meta: baseMeta,
    model,
  };
}
