import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";

function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const items = await prisma.generatedPrompt.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      department: { select: { name: true, icon: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="eyebrow">Every generation is saved &amp; versioned</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">History</h1>
      <p className="mt-1 text-[13.5px] text-ink2">
        Past prompts, newest first. Expand any row to view the full artifact.
      </p>

      {items.length === 0 ? (
        <Card className="mt-8 p-10 text-center text-ink3">
          No generations yet.{" "}
          <Link href="/" className="text-accent hover:underline">
            Forge your first prompt.
          </Link>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {items.map((g) => (
            <Card key={g.id} className="overflow-hidden">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 hover:bg-surface2">
                  <Badge tone="accent">{g.department.icon ?? "DEPT"}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-ink">
                      {g.department.name} · {g.useCase}
                    </div>
                    <div className="mono mt-0.5 text-[11px] text-ink3">
                      v{g.version} · {g.technique} · {g.provider} · {formatDate(g.createdAt)}
                    </div>
                  </div>
                  <span className="mono text-[11px] text-ink3 group-open:hidden">Show</span>
                  <span className="mono hidden text-[11px] text-ink3 group-open:inline">
                    Hide
                  </span>
                </summary>
                <div className="scroll-thin max-h-[50vh] overflow-auto border-t border-line bg-sunken px-4 py-4">
                  <pre className="mono whitespace-pre-wrap break-words text-[12px] leading-relaxed text-ink">
                    {g.prompt}
                  </pre>
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
