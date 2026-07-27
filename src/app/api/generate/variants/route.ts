import { prisma } from "@/lib/db";
import { runGeneration } from "@/lib/server/runGeneration";
import { generateRequestSchema, missingRequired } from "@/lib/validation";
import { buildModel } from "@/lib/engine/assemble";
import { ALT_TECHNIQUE } from "@/lib/engine/patterns";
import type { Answers, ComplianceRuleDef, DepartmentConfig, GenerateOptions } from "@/lib/departments/types";
import { applyFieldOverrides, enforceLockedAnswers } from "@/lib/departments/overrides";
import { clientKey, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Generates two genuinely different artifacts from one brief — variant B
// deliberately uses a different technique (and the opposite rigour) from
// variant A, rather than just a reworded duplicate — so there's a real choice
// to make, not a coin flip.

export async function POST(request: Request) {
  // Two full generations per call, so a tighter budget than /api/generate.
  const limited = rateLimit(clientKey(request), 10, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds!);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const department = await prisma.department.findFirst({
    where: { key: body.departmentKey, active: true },
    include: {
      templates: { where: { active: true }, orderBy: { version: "desc" }, take: 1 },
      complianceRules: { where: { active: true } },
      fieldOverrides: true,
    },
  });
  if (!department || !department.templates[0]) {
    return Response.json({ error: "Unknown department." }, { status: 404 });
  }

  const baseConfig = department.templates[0].schema as unknown as DepartmentConfig;
  const config = applyFieldOverrides(baseConfig, department.fieldOverrides);
  const compliance: ComplianceRuleDef[] = department.complianceRules.map((r) => ({
    code: r.code,
    label: r.label,
    description: r.description,
    severity: r.severity as "hard" | "soft",
  }));
  const answers = enforceLockedAnswers(config, body.answers as Answers);

  const missing = missingRequired(config, answers);
  if (missing.length) {
    return Response.json(
      { error: `Missing required fields: ${missing.map((m) => m.label).join(", ")}.` },
      { status: 400 },
    );
  }

  const optionsA: GenerateOptions = {
    useCase: body.useCase,
    outputFormat: body.outputFormat,
    verbosity: body.verbosity,
    rigor: body.rigor,
    refine: body.refine,
    clarifications: body.clarifications,
  };

  // Determine variant A's natural technique, then force variant B onto a
  // deliberately different one.
  const naturalTechnique = buildModel(config, answers, compliance, optionsA).technique;
  const optionsB: GenerateOptions = {
    ...optionsA,
    rigor: optionsA.rigor === "strict" ? "guidance" : "strict",
    techniqueOverride: ALT_TECHNIQUE[naturalTechnique],
  };

  // Sequential, not parallel: both share one submission, and the version
  // number is a count-then-insert — running them concurrently would race.
  try {
    const resultA = await runGeneration({
      departmentId: department.id,
      config,
      compliance,
      answers,
      options: optionsA,
      submissionId: body.submissionId,
      variantLabel: "A",
    });
    const resultB = await runGeneration({
      departmentId: department.id,
      config,
      compliance,
      answers,
      options: optionsB,
      submissionId: resultA.submissionId,
      variantLabel: "B",
    });

    return Response.json({
      submissionId: resultA.submissionId,
      variants: [
        { label: "A", ...resultA },
        { label: "B", ...resultB },
      ],
    });
  } catch {
    return Response.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
