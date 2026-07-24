import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEPARTMENT_SEEDS } from "../src/lib/departments";
import { PROMPT_PATTERNS } from "../src/lib/engine/patterns";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Prisma's Json input wants plain JSON — round-trip to strip class/undefined.
const json = (v: unknown) => JSON.parse(JSON.stringify(v));

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: { name: "Default Organisation", slug: "default" },
  });

  await prisma.user.upsert({
    where: { email: "owner@promptforge.local" },
    update: {},
    create: {
      email: "owner@promptforge.local",
      name: "Workspace Owner",
      role: "owner",
      orgId: org.id,
    },
  });

  for (const p of PROMPT_PATTERNS) {
    await prisma.promptPattern.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, whenToUse: p.whenToUse },
      create: {
        key: p.key,
        name: p.name,
        description: p.description,
        whenToUse: p.whenToUse,
      },
    });
  }

  for (const seed of DEPARTMENT_SEEDS) {
    const dept = await prisma.department.upsert({
      where: { orgId_key: { orgId: org.id, key: seed.config.key } },
      update: {
        name: seed.config.name,
        description: seed.config.description,
        icon: seed.config.icon,
        order: seed.order,
      },
      create: {
        orgId: org.id,
        key: seed.config.key,
        name: seed.config.name,
        description: seed.config.description,
        icon: seed.config.icon,
        order: seed.order,
      },
    });

    await prisma.formTemplate.upsert({
      where: { departmentId_version: { departmentId: dept.id, version: 1 } },
      update: { schema: json(seed.config), active: true },
      create: {
        departmentId: dept.id,
        version: 1,
        active: true,
        schema: json(seed.config),
      },
    });

    for (const rule of seed.compliance) {
      await prisma.complianceRule.upsert({
        where: { departmentId_code: { departmentId: dept.id, code: rule.code } },
        update: {
          label: rule.label,
          description: rule.description,
          severity: rule.severity ?? "hard",
        },
        create: {
          departmentId: dept.id,
          code: rule.code,
          label: rule.label,
          description: rule.description,
          severity: rule.severity ?? "hard",
        },
      });
    }

    console.log(
      `Seeded department "${seed.config.name}" with ${seed.compliance.length} compliance rules.`,
    );
  }

  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
