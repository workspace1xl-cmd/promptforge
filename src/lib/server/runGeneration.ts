// Server-only. The single place that turns a validated brief into a persisted,
// quality-checked generation. Shared by /api/generate (one artifact) and
// /api/generate/variants (two, run sequentially against the same submission
// so their version numbers don't race).

import { prisma } from "@/lib/db";
import { generate } from "@/lib/engine/provider";
import { critique } from "@/lib/engine/critique";
import type { Answers, ComplianceRuleDef, DepartmentConfig, GenerateOptions } from "@/lib/departments/types";

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

export interface RunGenerationInput {
  departmentId: string;
  config: DepartmentConfig;
  compliance: ComplianceRuleDef[];
  answers: Answers;
  options: GenerateOptions;
  /** Reuse an existing submission (regenerate, or the second half of an A/B pair). */
  submissionId?: string;
  /** Tags this generation as one half of an A/B comparison. */
  variantLabel?: "A" | "B";
}

export async function runGeneration(input: RunGenerationInput) {
  const { departmentId, config, compliance, answers, options } = input;

  const engine = await generate(config, answers, compliance, options);
  const quality = await critique(engine.model, engine.prompt, options);
  const finalPrompt = quality.repairedPrompt;

  let submissionId = input.submissionId;
  if (submissionId) {
    const exists = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
    if (!exists) submissionId = undefined;
  }
  if (!submissionId) {
    const sub = await prisma.formSubmission.create({
      data: { departmentId, useCase: options.useCase, answers: json(answers) },
    });
    submissionId = sub.id;
  }

  const priorVersions = await prisma.generatedPrompt.count({ where: { submissionId } });
  const outputFormatLabel = (engine.meta.outputFormat as string) ?? options.outputFormat;
  const meta = json({ ...engine.meta, quality });

  const gp = await prisma.generatedPrompt.create({
    data: {
      submissionId,
      departmentId,
      version: priorVersions + 1,
      useCase: options.useCase,
      technique: engine.technique,
      patternsUsed: engine.patternsUsed,
      provider: engine.provider,
      outputFormat: outputFormatLabel,
      prompt: finalPrompt,
      qualityScore: quality.score,
      variantLabel: input.variantLabel ?? null,
      meta,
      sop: { create: { title: `${config.name} — Brief`, body: engine.sop } },
    },
  });

  return {
    prompt: finalPrompt,
    sop: engine.sop,
    technique: engine.technique,
    patternsUsed: engine.patternsUsed,
    provider: engine.provider,
    outputFormat: outputFormatLabel,
    meta,
    qualityScore: quality.score,
    variantLabel: input.variantLabel ?? null,
    generatedPromptId: gp.id,
    submissionId,
    version: priorVersions + 1,
  };
}
