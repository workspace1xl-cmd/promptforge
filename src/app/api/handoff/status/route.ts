import { isGitHubConfigured } from "@/lib/integrations/github";
import { isJiraConfigured } from "@/lib/integrations/jira";

// Reports which hand-off connectors are configured — booleans only, never
// the underlying credentials — so the UI can grey out unavailable targets.
export async function GET() {
  return Response.json({
    github: isGitHubConfigured(),
    jira: isJiraConfigured(),
  });
}
