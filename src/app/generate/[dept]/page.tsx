import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Wizard } from "@/components/wizard/Wizard";
import { Badge } from "@/components/ui";
import type { ComplianceRuleDef, DepartmentConfig } from "@/lib/departments/types";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ dept: string }>;
}) {
  const { dept } = await params;

  const department = await prisma.department.findFirst({
    where: { key: dept, active: true },
    include: {
      templates: { where: { active: true }, orderBy: { version: "desc" }, take: 1 },
      complianceRules: { where: { active: true } },
    },
  });

  if (!department || !department.templates[0]) notFound();

  const config = department.templates[0].schema as unknown as DepartmentConfig;
  const compliance: ComplianceRuleDef[] = department.complianceRules.map((r) => ({
    code: r.code,
    label: r.label,
    description: r.description,
    severity: r.severity as "hard" | "soft",
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/"
        className="mono text-[12px] tracking-wide text-ink3 hover:text-accent"
      >
        ← All departments
      </Link>
      <div className="mb-7 mt-2 flex items-center gap-3">
        <Badge tone="accent">{config.icon}</Badge>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">{config.name}</h1>
          <p className="text-[13.5px] text-ink2">{config.description}</p>
        </div>
      </div>

      <Wizard config={config} compliance={compliance} departmentKey={department.key} />
    </main>
  );
}
