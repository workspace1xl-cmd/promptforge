import { prisma } from "@/lib/db";
import { z } from "zod";
import { answersSchema, shortId } from "@/lib/validation";

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

const saveSchema = z.object({
  departmentKey: shortId,
  useCase: shortId,
  name: z.string().min(1).max(80),
  answers: answersSchema,
});

export async function GET() {
  const templates = await prisma.formSubmission.findMany({
    where: { isTemplate: true },
    orderBy: { createdAt: "desc" },
    include: { department: { select: { name: true, key: true, icon: true } } },
    take: 100,
  });
  return Response.json(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      useCase: t.useCase,
      department: t.department,
      createdAt: t.createdAt,
    })),
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = saveSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const body = parsed.data;

  const department = await prisma.department.findFirst({
    where: { key: body.departmentKey, active: true },
  });
  if (!department) {
    return Response.json({ error: "Unknown department." }, { status: 404 });
  }

  const created = await prisma.formSubmission.create({
    data: {
      departmentId: department.id,
      useCase: body.useCase,
      answers: json(body.answers),
      name: body.name,
      isTemplate: true,
    },
  });

  return Response.json({ id: created.id, name: created.name });
}
