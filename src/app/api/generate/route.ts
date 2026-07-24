import { prisma } from "@/lib/db";
import { generate } from "@/lib/engine/provider";
import { generateRequestSchema, missingRequired } from "@/lib/validation";
import type {
  Answers,
  ComplianceRuleDef,
  DepartmentConfig,
  GenerateOptions,
} from "@/lib/departments/types";

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

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
  const incomingSubmissionId = (payload as { submissionId?: string }).submissionId;

  const department = await prisma.department.findFirst({
    where: { key: body.departmentKey, active: true },
    include: {
      templates: { where: { active: true }, orderBy: { version: "desc" }, take: 1 },
      complianceRules: { where: { active: true } },
    },
  });
  if (!department || !department.templates[0]) {
    return Response.json({ error: "Unknown department." }, { status: 404 });
  }

  const config = department.templates[0].schema as unknown as DepartmentConfig;
  const compliance: ComplianceRuleDef[] = department.complianceRules.map((r) => ({
    code: r.code,
    label: r.label,
    description: r.description,
    severity: r.severity as "hard" | "soft",
  }));
  const answers = body.answers as Answers;

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
  };

  const engine = await generate(config, answers, compliance, options);

  // Reuse the submission for regenerations so versions accrue against it.
  let submissionId = incomingSubmissionId;
  if (submissionId) {
    const exists = await prisma.formSubmission.findUnique({ where: { id: submissionId } });
    if (!exists) submissionId = undefined;
  }
  if (!submissionId) {
    const sub = await prisma.formSubmission.create({
      data: {
        departmentId: department.id,
        useCase: options.useCase,
        answers: json(answers),
      },
    });
    submissionId = sub.id;
  }

  const priorVersions = await prisma.generatedPrompt.count({ where: { submissionId } });
  const outputFormatLabel =
    (engine.meta.outputFormat as string) ?? options.outputFormat;

  const gp = await prisma.generatedPrompt.create({
    data: {
      submissionId,
      departmentId: department.id,
      version: priorVersions + 1,
      useCase: options.useCase,
      technique: engine.technique,
      patternsUsed: engine.patternsUsed,
      provider: engine.provider,
      outputFormat: outputFormatLabel,
      prompt: engine.prompt,
      meta: json(engine.meta),
      sop: { create: { title: `${config.name} — Brief`, body: engine.sop } },
    },
  });

  return Response.json({
    prompt: engine.prompt,
    sop: engine.sop,
    technique: engine.technique,
    patternsUsed: engine.patternsUsed,
    provider: engine.provider,
    outputFormat: outputFormatLabel,
    meta: engine.meta,
    generatedPromptId: gp.id,
    submissionId,
    version: priorVersions + 1,
  });
}
