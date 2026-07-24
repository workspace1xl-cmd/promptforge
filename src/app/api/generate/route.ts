import { prisma } from "@/lib/db";
import { runGeneration } from "@/lib/server/runGeneration";
import { generateRequestSchema, missingRequired } from "@/lib/validation";
import type { Answers, ComplianceRuleDef, DepartmentConfig, GenerateOptions } from "@/lib/departments/types";
import { applyFieldOverrides, enforceLockedAnswers } from "@/lib/departments/overrides";

export async function POST(request: Request) {
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
  // A locked field's value is enforced server-side regardless of what the
  // client sent — a tampered request can't unlock or omit it.
  const answers = enforceLockedAnswers(config, body.answers as Answers);

  const missing = missingRequired(config, answers);
  if (missing.length) {
    return Response.json(
      { error: `Missing required fields: ${missing.map((m) => m.label).join(", ")}.` },
      { status: 400 },
    );
  }

  const options: GenerateOptions = {
    useCase: body.useCase,
    outputFormat: body.outputFormat,
    verbosity: body.verbosity,
    rigor: body.rigor,
    refine: body.refine,
    clarifications: body.clarifications,
  };

  const result = await runGeneration({
    departmentId: department.id,
    config,
    compliance,
    answers,
    options,
    submissionId: body.submissionId,
  });

  return Response.json(result);
}
