import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { cn } from "@/lib/utils";
import { recentDayBuckets, windowStart } from "@/lib/analytics-window";

export const dynamic = "force-dynamic";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-1 text-[12.5px] text-ink3">{sub}</div>}
    </Card>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-[13px] text-ink2">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="mono w-10 shrink-0 text-right text-[12px] text-ink3">{count}</span>
    </div>
  );
}

export default async function AnalyticsPage() {
  const [
    totalSubmissions,
    totalGenerations,
    totalTemplates,
    departments,
    byDepartment,
    byProvider,
    byTechnique,
    handoffs,
    recentGenerations,
  ] = await Promise.all([
    prisma.formSubmission.count(),
    prisma.generatedPrompt.count(),
    prisma.formSubmission.count({ where: { isTemplate: true } }),
    prisma.department.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: { _count: { select: { generatedPrompts: true, submissions: true } } },
    }),
    prisma.generatedPrompt.groupBy({
      by: ["departmentId"],
      _avg: { qualityScore: true },
      _count: true,
    }),
    prisma.generatedPrompt.groupBy({ by: ["provider"], _count: true }),
    prisma.generatedPrompt.groupBy({ by: ["technique"], _count: true }),
    prisma.handoffLog.groupBy({ by: ["target", "status"], _count: true }),
    prisma.generatedPrompt.findMany({
      where: { createdAt: { gte: windowStart(14) } },
      select: { createdAt: true },
    }),
  ]);

  // Reuse rate: what share of submissions were regenerated at least once.
  const versionsPerSubmission = await prisma.generatedPrompt.groupBy({
    by: ["submissionId"],
    _count: true,
  });
  const submissionsWithGenerations = versionsPerSubmission.length;
  const regeneratedCount = versionsPerSubmission.filter((s) => s._count > 1).length;
  const reuseRate = submissionsWithGenerations
    ? Math.round((regeneratedCount / submissionsWithGenerations) * 100)
    : 0;

  const qualityByDept = new Map(byDepartment.map((d) => [d.departmentId, d]));
  const maxDeptCount = Math.max(1, ...departments.map((d) => d._count.generatedPrompts));

  // Last 14 days, oldest to newest, zero-filled.
  const days = recentDayBuckets(14).map(({ key, label }) => ({
    label,
    count: recentGenerations.filter((g) => g.createdAt.toISOString().slice(0, 10) === key).length,
  }));
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="eyebrow">Org-wide usage</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Analytics</h1>
      <p className="mt-1 text-[13.5px] text-ink2">
        Which departments generate the most, how often briefs get reused, and where
        generations come from.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Submissions" value={String(totalSubmissions)} />
        <StatTile label="Generations" value={String(totalGenerations)} />
        <StatTile
          label="Reuse rate"
          value={`${reuseRate}%`}
          sub="submissions regenerated at least once"
        />
        <StatTile label="Saved templates" value={String(totalTemplates)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="eyebrow mb-4">Generations by department</div>
          <div className="flex flex-col gap-3">
            {departments.map((d) => {
              const q = qualityByDept.get(d.id);
              const avg = q?._avg.qualityScore;
              return (
                <div key={d.id} className="flex flex-col gap-1">
                  <BarRow label={d.name} count={d._count.generatedPrompts} max={maxDeptCount} />
                  <div className="ml-[172px] flex items-center gap-2">
                    {avg != null && (
                      <Badge tone={avg >= 80 ? "ok" : "neutral"}>avg quality {Math.round(avg)}</Badge>
                    )}
                    <span className="mono text-[11px] text-ink3">
                      {d._count.submissions} submission{d._count.submissions === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="eyebrow mb-4">Last 14 days</div>
          <div className="flex h-32 items-end gap-1.5">
            {days.map((d) => (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-end justify-end"
                title={`${d.label}: ${d.count}`}
              >
                <div
                  className={cn("w-full rounded-t-sm bg-accent transition-all", d.count === 0 && "bg-line2")}
                  // Pixel height, not a %, so it renders correctly regardless
                  // of how the flex column above resolves cross-axis sizing.
                  style={{ height: `${Math.max(4, Math.round((d.count / maxDay) * 118))}px` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink3">
            <span>{days[0]?.label}</span>
            <span>{days[days.length - 1]?.label}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="eyebrow mb-4">Provider mix</div>
          <div className="flex flex-col gap-3">
            {byProvider.length === 0 && <span className="text-[13px] text-ink3">No generations yet.</span>}
            {byProvider
              .sort((a, b) => b._count - a._count)
              .map((p) => (
                <BarRow
                  key={p.provider}
                  label={p.provider}
                  count={p._count}
                  max={Math.max(1, ...byProvider.map((x) => x._count))}
                />
              ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="eyebrow mb-4">Technique mix</div>
          <div className="flex flex-col gap-3">
            {byTechnique.length === 0 && <span className="text-[13px] text-ink3">No generations yet.</span>}
            {byTechnique
              .sort((a, b) => b._count - a._count)
              .map((t) => (
                <BarRow
                  key={t.technique}
                  label={t.technique}
                  count={t._count}
                  max={Math.max(1, ...byTechnique.map((x) => x._count))}
                />
              ))}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="eyebrow mb-4">Hand-off attempts</div>
          {handoffs.length === 0 ? (
            <span className="text-[13px] text-ink3">
              No hand-offs sent yet — try &ldquo;Send to GitHub&rdquo; or &ldquo;Send to Jira&rdquo; from a
              result screen.
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {handoffs.map((h) => (
                <Badge
                  key={`${h.target}-${h.status}`}
                  tone={h.status === "success" ? "ok" : h.status === "failed" ? "neutral" : "neutral"}
                >
                  {h.target} · {h.status} · {h._count}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
