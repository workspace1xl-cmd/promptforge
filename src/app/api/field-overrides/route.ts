import { z } from "zod";
import { prisma } from "@/lib/db";
import { allFields } from "@/lib/engine/assemble";
import { LOCKABLE_FIELD_TYPES } from "@/lib/departments/types";
import type { DepartmentConfig } from "@/lib/departments/types";

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

async function loadDepartment(departmentKey: string) {
  return prisma.department.findFirst({
    where: { key: departmentKey, active: true },
    include: {
      templates: { where: { active: true }, orderBy: { version: "desc" }, take: 1 },
      fieldOverrides: true,
    },
  });
}

export async function GET(request: Request) {
  const departmentKey = new URL(request.url).searchParams.get("departmentKey");
  if (!departmentKey) return Response.json({ error: "Missing departmentKey." }, { status: 400 });

  const dept = await loadDepartment(departmentKey);
  if (!dept || !dept.templates[0]) {
    return Response.json({ error: "Unknown department." }, { status: 404 });
  }

  const config = dept.templates[0].schema as unknown as DepartmentConfig;
  const overrideByField = new Map(dept.fieldOverrides.map((o) => [o.fieldId, o]));

  const fields = allFields(config)
    .filter((f) => f.id !== "useCase")
    .map((f) => {
      const o = overrideByField.get(f.id);
      return {
        fieldId: f.id,
        label: f.label,
        type: f.type,
        baseRequired: !!f.required,
        lockable: LOCKABLE_FIELD_TYPES.includes(f.type),
        options: f.options ?? null,
        overrideId: o?.id ?? null,
        required: o?.required ?? null,
        locked: o?.locked ?? false,
        lockedValue: o?.lockedValue ?? null,
      };
    });

  return Response.json({ departmentKey, departmentName: dept.name, fields });
}

const upsertSchema = z.object({
  departmentKey: z.string().min(1),
  fieldId: z.string().min(1),
  required: z.boolean().nullable(),
  locked: z.boolean(),
  lockedValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
});

export async function POST(request: Request) {
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const body = parsed.data;

  const dept = await loadDepartment(body.departmentKey);
  if (!dept || !dept.templates[0]) {
    return Response.json({ error: "Unknown department." }, { status: 404 });
  }
  const config = dept.templates[0].schema as unknown as DepartmentConfig;
  const field = allFields(config).find((f) => f.id === body.fieldId);
  if (!field) return Response.json({ error: "Unknown field." }, { status: 404 });

  if (body.locked) {
    if (!LOCKABLE_FIELD_TYPES.includes(field.type)) {
      return Response.json(
        { error: `"${field.label}" is a ${field.type} field and can't be locked to a fixed value.` },
        { status: 400 },
      );
    }
    if (body.lockedValue === undefined || body.lockedValue === null || body.lockedValue === "") {
      return Response.json({ error: "A locked field needs a fixed value." }, { status: 400 });
    }
    if (
      (field.type === "select" || field.type === "segment") &&
      field.options &&
      !field.options.some((o) => o.value === body.lockedValue)
    ) {
      return Response.json({ error: "The locked value must be one of the field's options." }, { status: 400 });
    }
  }

  const override = await prisma.fieldOverride.upsert({
    where: { departmentId_fieldId: { departmentId: dept.id, fieldId: body.fieldId } },
    update: {
      required: body.required,
      locked: body.locked,
      lockedValue: body.locked ? json(body.lockedValue) : null,
    },
    create: {
      departmentId: dept.id,
      fieldId: body.fieldId,
      required: body.required,
      locked: body.locked,
      lockedValue: body.locked ? json(body.lockedValue) : null,
    },
  });

  return Response.json({ id: override.id });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  await prisma.fieldOverride.delete({ where: { id } }).catch(() => null);
  return Response.json({ ok: true });
}
