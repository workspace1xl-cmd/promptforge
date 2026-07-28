import { callAnthropic } from "./anthropic";

export interface ReviewFinding {
  severity: "critical" | "high" | "medium" | "low";
  finding: string;
  recommendation: string;
}

export interface ReviewerReport {
  id: string;
  label: string;
  summary: string;
  findings: ReviewFinding[];
  missingRequirements: string[];
  acceptanceChecks: string[];
  status: "completed" | "fallback";
}

const REVIEWERS = [
  {
    id: "requirements",
    label: "Requirements analyst",
    focus: "Find ambiguity, contradictions, missing user journeys, edge cases, data rules, dependencies, assumptions and measurable acceptance criteria.",
  },
  {
    id: "architecture",
    label: "Architecture & security reviewer",
    focus: "Evaluate architecture fit, integration boundaries, failure modes, privacy, authentication, authorization, secrets, validation, abuse cases, migrations and rollback.",
  },
  {
    id: "quality",
    label: "Testing & reliability reviewer",
    focus: "Define unit, integration, end-to-end, accessibility, performance, concurrency, observability and regression checks, including negative paths.",
  },
  {
    id: "delivery",
    label: "Delivery & coding-agent reviewer",
    focus: "Turn the work into small verifiable phases, identify repository discovery steps, safe sequencing, release gates, documentation and an efficient coding-agent working agreement.",
  },
] as const;

function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Reviewer returned no JSON object.");
  return JSON.parse(raw.slice(start, end + 1));
}

function cleanStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .slice(0, limit)
    .map((item) => item.trim().slice(0, 800));
}

async function runReviewer(
  reviewer: (typeof REVIEWERS)[number],
  brief: string,
  apiKey: string,
): Promise<ReviewerReport> {
  const system = [
    `You are the ${reviewer.label} on an independent pre-build review council.`,
    reviewer.focus,
    "Analyze only the supplied brief. Do not invent client facts. Separate a missing requirement from a recommended implementation choice.",
    "Return only JSON with this shape:",
    '{"summary":"string","findings":[{"severity":"critical|high|medium|low","finding":"string","recommendation":"string"}],"missingRequirements":["string"],"acceptanceChecks":["string"]}',
  ].join("\n");

  try {
    const raw = await callAnthropic({ system, user: brief, apiKey, maxTokens: 1500, temperature: 0.1 });
    const parsed = extractJson(raw) as Record<string, unknown>;
    const findings = Array.isArray(parsed.findings)
      ? parsed.findings
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .slice(0, 10)
          .map((item) => ({
            severity: (["critical", "high", "medium", "low"].includes(String(item.severity)) ? String(item.severity) : "medium") as ReviewFinding["severity"],
            finding: String(item.finding ?? "").trim().slice(0, 800),
            recommendation: String(item.recommendation ?? "").trim().slice(0, 800),
          }))
          .filter((item) => item.finding)
      : [];
    return {
      id: reviewer.id,
      label: reviewer.label,
      summary: String(parsed.summary ?? "Review completed.").trim().slice(0, 1200),
      findings,
      missingRequirements: cleanStrings(parsed.missingRequirements, 10),
      acceptanceChecks: cleanStrings(parsed.acceptanceChecks, 12),
      status: "completed",
    };
  } catch {
    return {
      id: reviewer.id,
      label: reviewer.label,
      summary: "Automated reviewer was unavailable; the final synthesizer must cover this review area directly.",
      findings: [],
      missingRequirements: [],
      acceptanceChecks: [],
      status: "fallback",
    };
  }
}

export async function runReviewCouncil(brief: string, apiKey: string): Promise<ReviewerReport[]> {
  return Promise.all(REVIEWERS.map((reviewer) => runReviewer(reviewer, brief, apiKey)));
}

export function localReviewCouncil(): ReviewerReport[] {
  return REVIEWERS.map((reviewer) => ({
    id: reviewer.id,
    label: reviewer.label,
    summary: `${reviewer.focus} Configure ANTHROPIC_API_KEY for independent AI review.`,
    findings: [],
    missingRequirements: [],
    acceptanceChecks: [],
    status: "fallback",
  }));
}
