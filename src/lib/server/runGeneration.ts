// Server-only. The single place that turns a validated brief into a persisted,
// quality-checked generation. Shared by /api/generate (one artifact) and
// /api/generate/variants (two, run sequentially against the same submission
// so their version numbers don't race).

import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { generate } from "@/lib/engine/provider";
import { critique } from "@/lib/engine/critique";
import type { Answers, ComplianceRuleDef, DepartmentConfig, GenerateOptions } from "@/lib/departments/types";

const MAX_VERSION_RETRIES = 3;

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

  const outputFormatLabel = (engine.meta.outputFormat as string) ?? options.outputFormat;
  const meta = json({ ...engine.meta, quality });

  // count-then-insert races if two requests hit the same submission at once;
  // the @@unique([submissionId, version]) constraint (see schema.prisma —
  // NOT YET APPLIED to the database pending operator consent) catches that
  // instead of silently producing duplicate version numbers, and we just
  // recount+retry. Until that migration is applied, this loop always
  // succeeds on the first attempt (harmless no-op, not a regression).
  let gp: Awaited<ReturnType<typeof prisma.generatedPrompt.create>> | undefined;
  let version = 0;
  for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt++) {
    const priorVersions = await prisma.generatedPrompt.count({ where: { submissionId } });
    version = priorVersions + 1;
    try {
      gp = await prisma.generatedPrompt.create({
        data: {
          submissionId,
          departmentId,
          version,
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
      break;
    } catch (err) {
      const isVersionConflict =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isVersionConflict || attempt === MAX_VERSION_RETRIES - 1) throw err;
    }
  }
  if (!gp) throw new Error("Could not create the generation after retrying.");

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
    version,
  };
}
