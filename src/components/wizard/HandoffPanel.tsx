"use client";

import * as React from "react";
import { Button, Spinner } from "@/components/ui";

interface ConnectorStatus {
  github: boolean;
  jira: boolean;
}

export function HandoffPanel({
  generatedPromptId,
  onToast,
}: {
  generatedPromptId?: string;
  onToast: (msg: string) => void;
}) {
  const [status, setStatus] = React.useState<ConnectorStatus | null>(null);
  const [sending, setSending] = React.useState<"github" | "jira" | null>(null);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch("/api/handoff/status");
      const data = await res.json();
      if (!ignore) setStatus(res.ok ? data : { github: false, jira: false });
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const send = async (target: "github" | "jira") => {
    if (!generatedPromptId) {
      onToast("Generate a prompt first.");
      return;
    }
    setSending(target);
    try {
      const res = await fetch("/api/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedPromptId, target }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onToast(data?.error ?? `Could not send to ${target === "github" ? "GitHub" : "Jira"}.`);
        return;
      }
      if (data.url) {
        onToast(`${target === "github" ? "Issue" : "Ticket"} created — opening it now.`);
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        onToast(`Sent to ${target === "github" ? "GitHub" : "Jira"}.`);
      }
    } catch {
      onToast("Network error — please try again.");
    } finally {
      setSending(null);
    }
  };

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-ink3">
        <Spinner /> Checking hand-off connectors…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        onClick={() => send("github")}
        disabled={!status.github || sending !== null}
        title={status.github ? "Create a GitHub issue from this artifact" : "Set GITHUB_TOKEN + GITHUB_REPO to enable"}
      >
        {sending === "github" ? <Spinner /> : null}
        {status.github ? "Send to GitHub" : "GitHub (not configured)"}
      </Button>
      <Button
        size="sm"
        onClick={() => send("jira")}
        disabled={!status.jira || sending !== null}
        title={status.jira ? "Create a Jira ticket from this artifact" : "Set JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN/JIRA_PROJECT_KEY to enable"}
      >
        {sending === "jira" ? <Spinner /> : null}
        {status.jira ? "Send to Jira" : "Jira (not configured)"}
      </Button>
    </div>
  );
}
