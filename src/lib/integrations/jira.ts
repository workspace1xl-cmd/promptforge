// Server-only, optional connector. Set JIRA_BASE_URL, JIRA_EMAIL,
// JIRA_API_TOKEN and JIRA_PROJECT_KEY to actually create a ticket; without
// them, callers fall back to a copy-ready hand-off. Credentials are read
// from the server environment only.

import type { HandoffResult } from "./types";

export function isJiraConfigured(): boolean {
  return Boolean(
    process.env.JIRA_BASE_URL?.trim() &&
      process.env.JIRA_EMAIL?.trim() &&
      process.env.JIRA_API_TOKEN?.trim() &&
      process.env.JIRA_PROJECT_KEY?.trim(),
  );
}

// Minimal, valid Atlassian Document Format: one paragraph node per line.
function toADF(text: string) {
  const lines = text.split("\n");
  return {
    type: "doc",
    version: 1,
    content: lines.map((line) =>
      line.trim()
        ? { type: "paragraph", content: [{ type: "text", text: line }] }
        : { type: "paragraph" },
    ),
  };
}

export async function createJiraIssue(
  summary: string,
  description: string,
): Promise<HandoffResult> {
  const base = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  const issueType = process.env.JIRA_ISSUE_TYPE?.trim() || "Task";
  if (!base || !email || !token || !projectKey) {
    return { ok: false, error: "Jira hand-off is not configured." };
  }

  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const baseUrl = base.replace(/\/$/, "");
  try {
    const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: summary.slice(0, 250),
          issuetype: { name: issueType },
          description: toADF(description.slice(0, 30000)),
        },
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Jira rejected the request (HTTP ${res.status}).` };
    }
    const data = (await res.json()) as { key?: string };
    return {
      ok: true,
      url: data.key ? `${baseUrl}/browse/${data.key}` : undefined,
    };
  } catch {
    return { ok: false, error: "Could not reach Jira." };
  }
}
