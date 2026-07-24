import { prisma } from "@/lib/db";
import { buildPdf } from "@/lib/export/pdf";
import { buildDocx } from "@/lib/export/docx";
import type { ExportBundle } from "@/lib/export/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function formatDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (format !== "pdf" && format !== "docx") {
    return Response.json({ error: 'format must be "pdf" or "docx".' }, { status: 400 });
  }

  const gp = await prisma.generatedPrompt.findUnique({
    where: { id },
    include: { department: { select: { name: true } }, sop: true },
  });
  if (!gp) return Response.json({ error: "Generation not found." }, { status: 404 });

  const bundle: ExportBundle = {
    title: `${gp.department.name}: ${gp.useCase}`,
    subtitleLines: [
      `Output: ${gp.outputFormat}`,
      `Technique: ${gp.technique}`,
      gp.qualityScore !== null ? `Quality score: ${gp.qualityScore}/100` : null,
      `Generated ${formatDate(gp.createdAt)} with PromptForge`,
    ].filter((l): l is string => Boolean(l)),
    sections: [
      { heading: "AI Prompt", body: gp.prompt },
      { heading: "SOP / Briefing", body: gp.sop?.body ?? "No SOP was generated for this artifact." },
    ],
  };

  const filename = `promptforge-${slugify(gp.department.name)}-${slugify(gp.useCase)}`;

  if (format === "pdf") {
    const bytes = await buildPdf(bundle);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const buf = await buildDocx(bundle);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}.docx"`,
    },
  });
}
