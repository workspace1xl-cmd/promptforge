// Small server-only Claude Messages API client.

export const anthropicModel = () =>
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

const RETRYABLE_STATUSES = new Set([408, 409, 429, 500, 502, 503, 529]);

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

type AnthropicContentBlock = {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
};

async function requestAnthropic({
  system,
  user,
  apiKey,
  maxTokens,
  temperature,
  extraBody = {},
}: {
  system: string;
  user: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  extraBody?: Record<string, unknown>;
}): Promise<AnthropicContentBlock[]> {
  const base = process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: anthropicModel(),
          max_tokens: maxTokens,
          temperature,
          system,
          messages: [{ role: "user", content: user }],
          ...extraBody,
        }),
        signal: AbortSignal.timeout(75_000),
      });

      if (response.ok) {
        const data = (await response.json()) as { content?: AnthropicContentBlock[] };
        return data.content ?? [];
      }

      const body = await response.text().catch(() => "");
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === 2) {
        throw new Error(`Claude request failed (${response.status}): ${body.slice(0, 240)}`);
      }
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfterSeconds)
        ? Math.min(retryAfterSeconds * 1000, 15_000)
        : 1000 * 2 ** attempt;
      await wait(delay);
    } catch (error) {
      if (attempt === 2 || (error instanceof Error && error.message.startsWith("Claude request failed"))) {
        throw error;
      }
      await wait(1000 * 2 ** attempt);
    }
  }
  throw new Error("Claude request failed after retries.");
}

export async function callAnthropic({
  system,
  user,
  apiKey,
  maxTokens = 4096,
  temperature = 0.2,
}: {
  system: string;
  user: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const content = await requestAnthropic({ system, user, apiKey, maxTokens, temperature });
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function callAnthropicTool<T>({
  system,
  user,
  apiKey,
  toolName,
  description,
  inputSchema,
  maxTokens = 4096,
}: {
  system: string;
  user: string;
  apiKey: string;
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const content = await requestAnthropic({
    system,
    user,
    apiKey,
    maxTokens,
    temperature: 0,
    extraBody: {
      tools: [{ name: toolName, description, input_schema: inputSchema }],
      tool_choice: { type: "tool", name: toolName },
    },
  });
  const toolUse = content.find((block) => block.type === "tool_use" && block.name === toolName);
  if (!toolUse || !toolUse.input || typeof toolUse.input !== "object") {
    throw new Error(`Claude did not return the required ${toolName} tool payload.`);
  }
  return toolUse.input as T;
}
