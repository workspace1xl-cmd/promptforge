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
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const candidates: string[] = [];
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      candidates.push(cleaned.slice(objectStart, objectEnd + 1));
    }
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
    }
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Try the next supported envelope.
      }
    }
  }
  throw new Error("Reviewer returned no complete JSON value.");
}

function cleanStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .slice(0, limit)
    .map((item) => item.trim().slice(0, 800));
}

function fallbackReport(reviewer: (typeof REVIEWERS)[number]): ReviewerReport {
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

function normalizeReport(
  reviewer: (typeof REVIEWERS)[number],
  parsed: Record<string, unknown> | undefined,
): ReviewerReport {
  if (!parsed) return fallbackReport(reviewer);
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings
          .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
          .slice(0, 4)
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
    missingRequirements: cleanStrings(parsed.missingRequirements, 4),
    acceptanceChecks: cleanStrings(parsed.acceptanceChecks, 5),
    status: "completed",
  };
}

export async function runReviewCouncil(brief: string, apiKey: string): Promise<ReviewerReport[]> {
  // One batched inference keeps entry-level API tiers fast and reliable while
  // preserving four isolated perspectives and four separately structured
  // reports for synthesis and UI transparency.
  const reviewerInstructions = REVIEWERS.map(
    (reviewer) => `${reviewer.id} (${reviewer.label}): ${reviewer.focus}`,
  ).join("\n");
  const system = [
    "You are a four-role pre-build review council. Evaluate the brief independently from each role's perspective; do not let one role replace or dilute another.",
    reviewerInstructions,
    "Analyze only the supplied brief. Do not invent client facts. Separate missing requirements from recommended implementation choices.",
    "Keep the council compact. Each report may contain at most 4 findings, 4 missing requirements and 5 acceptance checks.",
    "Return only JSON with exactly one report for each id in the listed order:",
    '{"reports":[{"id":"requirements|architecture|quality|delivery","summary":"string","findings":[{"severity":"critical|high|medium|low","finding":"string","recommendation":"string"}],"missingRequirements":["string"],"acceptanceChecks":["string"]}]}',
  ].join("\n");
  try {
    const raw = await callAnthropic({ system, user: brief, apiKey, maxTokens: 2800, temperature: 0.1 });
    const parsed = extractJson(raw) as
      | Array<Record<string, unknown>>
      | { reports?: Array<Record<string, unknown>> };
    const reports = Array.isArray(parsed) ? parsed : (parsed.reports ?? []);
    const byId = new Map(reports.map((report) => [String(report.id), report]));
    return REVIEWERS.map((reviewer, index) =>
      normalizeReport(reviewer, byId.get(reviewer.id) ?? reports[index]),
    );
  } catch {
    return REVIEWERS.map(fallbackReport);
  }
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
