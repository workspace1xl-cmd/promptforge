import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  departmentKey: z.string().min(1),
  code: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  severity: z.enum(["hard", "soft"]).default("hard"),
});

const patchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80).optional(),
  description: z.string().min(1).max(400).optional(),
  severity: z.enum(["hard", "soft"]).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const depts = await prisma.department.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { complianceRules: { orderBy: { code: "asc" } } },
  });
  return Response.json(
    depts.map((d) => ({
      key: d.key,
      name: d.name,
      icon: d.icon,
      rules: d.complianceRules.map((r) => ({
        id: r.id,
        code: r.code,
        label: r.label,
        description: r.description,
        severity: r.severity,
        active: r.active,
      })),
    })),
  );
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const body = parsed.data;

  const dept = await prisma.department.findFirst({ where: { key: body.departmentKey } });
  if (!dept) return Response.json({ error: "Unknown department." }, { status: 404 });

  const existing = await prisma.complianceRule.findUnique({
    where: { departmentId_code: { departmentId: dept.id, code: body.code } },
  });
  if (existing)
    return Response.json(
      { error: `A rule with code ${body.code} already exists.` },
      { status: 409 },
    );

  const rule = await prisma.complianceRule.create({
    data: {
      departmentId: dept.id,
      code: body.code,
      label: body.label,
      description: body.description,
      severity: body.severity,
    },
  });
  return Response.json({ id: rule.id });
}

export async function PATCH(request: Request) {
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { id, ...data } = parsed.data;
  await prisma.complianceRule.update({ where: { id }, data });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  await prisma.complianceRule.delete({ where: { id } });
  return Response.json({ ok: true });
}
