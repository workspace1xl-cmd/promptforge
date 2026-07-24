import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Button, Card } from "@/components/ui";

function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.formSubmission.findMany({
    where: { isTemplate: true },
    orderBy: { createdAt: "desc" },
    include: { department: { select: { name: true, key: true, icon: true } } },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="eyebrow">Save &amp; reuse good briefs across the team</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Templates library</h1>
      <p className="mt-1 text-[13.5px] text-ink2">
        Saved from the output screen. Load one to pre-fill the wizard, then tweak and forge.
      </p>

      {templates.length === 0 ? (
        <Card className="mt-8 p-10 text-center text-ink3">
          No saved templates yet. Generate a prompt, then choose{" "}
          <span className="text-ink2">Save as template</span>.
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex items-center gap-3 p-4">
              <Badge tone="accent">{t.department.icon ?? "DEPT"}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-ink">{t.name}</div>
                <div className="mono mt-0.5 text-[11px] text-ink3">
                  {t.department.name} · {t.useCase} · {formatDate(t.createdAt)}
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                href={`/generate/${t.department.key}?template=${t.id}`}
              >
                Load →
              </Button>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
