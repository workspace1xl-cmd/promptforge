import { z } from "zod";
import { prisma } from "@/lib/db";
import { createGitHubIssue, isGitHubConfigured } from "@/lib/integrations/github";
import { createJiraIssue, isJiraConfigured } from "@/lib/integrations/jira";
import { handoffBody, handoffTitle } from "@/lib/integrations/format";
import type { HandoffResult } from "@/lib/integrations/types";
import { clientKey, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  generatedPromptId: z.string().min(1),
  target: z.enum(["github", "jira", "copy"]),
});

export async function POST(request: Request) {
  // Real external issues/tickets are created here using the operator's own
  // credentials — a tighter budget than the generation endpoints.
  const limited = rateLimit(clientKey(request), 10, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds!);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { generatedPromptId, target } = parsed.data;

  const gp = await prisma.generatedPrompt.findUnique({
    where: { id: generatedPromptId },
    include: { department: { select: { name: true } } },
  });
  if (!gp) return Response.json({ error: "Generation not found." }, { status: 404 });

  const source = {
    departmentName: gp.department.name,
    useCase: gp.useCase,
    outputFormat: gp.outputFormat,
    technique: gp.technique,
    qualityScore: gp.qualityScore,
    prompt: gp.prompt,
  };
  const title = handoffTitle(source);
  const body = handoffBody(source);

  let result: HandoffResult;
  let status: "success" | "failed" | "not_configured";

  if (target === "copy") {
    result = { ok: true };
    status = "success";
  } else if (target === "github") {
    if (!isGitHubConfigured()) {
      result = { ok: false, error: "GitHub hand-off is not configured on this deployment." };
      status = "not_configured";
    } else {
      result = await createGitHubIssue(title, body);
      status = result.ok ? "success" : "failed";
    }
  } else {
    if (!isJiraConfigured()) {
      result = { ok: false, error: "Jira hand-off is not configured on this deployment." };
      status = "not_configured";
    } else {
      result = await createJiraIssue(title, body);
      status = result.ok ? "success" : "failed";
    }
  }

  await prisma.handoffLog.create({
    data: {
      generatedPromptId,
      target,
      status,
      detail: result.url ?? result.error ?? null,
    },
  });

  return Response.json({
    ok: result.ok,
    url: result.url,
    error: result.error,
    title,
    body,
  });
}
