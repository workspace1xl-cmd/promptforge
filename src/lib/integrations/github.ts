// Server-only, optional connector. Set GITHUB_TOKEN + GITHUB_REPO ("owner/repo")
// to actually create an issue; without them, callers fall back to a
// copy-ready hand-off. The token is read from the server environment only —
// it is never sent to, or accepted from, the client.

import type { HandoffResult } from "./types";

export function isGitHubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim() && process.env.GITHUB_REPO?.trim());
}

export async function createGitHubIssue(title: string, body: string): Promise<HandoffResult> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // "owner/repo"
  if (!token || !repo) return { ok: false, error: "GitHub hand-off is not configured." };

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    return { ok: false, error: 'GITHUB_REPO must be in "owner/repo" format.' };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ title: title.slice(0, 250), body: body.slice(0, 60000) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      // Never echo the upstream body back to the client — it can contain
      // request-detail hints that aren't ours to expose.
      return { ok: false, error: `GitHub rejected the request (HTTP ${res.status}).` };
    }
    const data = (await res.json()) as { html_url?: string };
    return { ok: true, url: data.html_url };
  } catch {
    return { ok: false, error: "Could not reach GitHub." };
  }
}
