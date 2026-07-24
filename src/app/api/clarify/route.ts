import { prisma } from "@/lib/db";
import { getClarifyingQuestions, isUnderspecified } from "@/lib/engine/clarify";
import { clarifyRequestSchema } from "@/lib/validation";
import type { Answers, DepartmentConfig } from "@/lib/departments/types";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = clarifyRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;

  const department = await prisma.department.findFirst({
    where: { key: body.departmentKey, active: true },
    include: { templates: { where: { active: true }, orderBy: { version: "desc" }, take: 1 } },
  });
  if (!department || !department.templates[0]) {
    return Response.json({ error: "Unknown department." }, { status: 404 });
  }

  const config = department.templates[0].schema as unknown as DepartmentConfig;
  const answers = body.answers as Answers;

  const underspecified = isUnderspecified(config, answers);
  const questions = underspecified ? getClarifyingQuestions(config, answers) : [];

  return Response.json({ underspecified, questions });
}
