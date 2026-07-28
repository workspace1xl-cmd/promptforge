import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  const departments = await prisma.department.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { complianceRules: true } } },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <section className="max-w-2xl">
        <div className="eyebrow">Four-agent requirement review · Claude-powered</div>
        <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight text-ink sm:text-[2.7rem]">
          Turn any SOP into a{" "}
          <span className="text-forge">ship-ready coding prompt.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink2">
          Upload a PDF or Word brief, or paste the text. Four independent reviewers check
          requirements, architecture and security, test coverage, and delivery risks before
          Claude creates a phased prompt for Claude Code, Cursor, Codex, Antigravity, or
          another coding agent.
        </p>
      </section>

      <section className="mt-10">
        <div className="eyebrow mb-3">Choose a department</div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Link key={d.id} href={`/generate/${d.key}`} className="group">
              <Card className="flex h-full flex-col gap-3 p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-accent group-hover:shadow-md">
                <div className="flex items-center justify-between">
                  <Badge tone="accent">{d.icon ?? "DEPT"}</Badge>
                  <span className="mono text-[11px] text-ink3">
                    {d._count.complianceRules} rules
                  </span>
                </div>
                <h3 className="text-[15.5px] font-semibold tracking-tight text-ink">
                  {d.name}
                </h3>
                <p className="text-[13px] leading-snug text-ink2">{d.description}</p>
                <span className="mono mt-auto text-[12px] text-ink3 group-hover:text-accent">
                  Start →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
