// Prompt-engineering pattern catalog. Grounded in Vanderbilt's prompt-pattern
// mental model and the Google whitepaper's technique selection. Seeded into the
// PromptPattern table and used by the assembly engine to shape output.

export interface PatternDef {
  key: string;
  name: string;
  description: string;
  whenToUse: string;
  /** An instruction line injected into the assembled prompt when active. */
  instruction?: string;
}

export const PROMPT_PATTERNS: PatternDef[] = [
  {
    key: "persona",
    name: "Persona Pattern",
    description:
      "Frame the model as a specific expert so its knowledge, vocabulary and standards match the task.",
    whenToUse: "Almost always — sets the quality bar and voice.",
    instruction: undefined,
  },
  {
    key: "template",
    name: "Template Pattern",
    description:
      "Pin the output to a fixed structure or schema the consumer can rely on.",
    whenToUse: "When the result feeds a downstream process or must be consistent.",
    instruction:
      "Follow the specified output structure exactly. Do not add, remove or reorder sections.",
  },
  {
    key: "recipe",
    name: "Recipe Pattern",
    description: "Ask for an explicit, ordered sequence of steps to reach the goal.",
    whenToUse: "Build plans, procedures, migrations, multi-stage tasks.",
    instruction:
      "Break the work into an explicit, numbered sequence of steps, in the order they should be done.",
  },
  {
    key: "flipped-interaction",
    name: "Flipped Interaction Pattern",
    description:
      "Have the model ask clarifying questions before producing the final answer.",
    whenToUse: "When inputs are likely underspecified (added in Phase 2).",
    instruction: undefined,
  },
  {
    key: "few-shot",
    name: "Few-shot Examples",
    description: "Provide one or more worked examples to imitate.",
    whenToUse: "When a reference of the desired quality/style is available.",
    instruction: "Match the style, structure and quality of the examples provided above.",
  },
  {
    key: "chain-of-thought",
    name: "Chain-of-Thought",
    description: "Ask the model to reason through the problem before answering.",
    whenToUse: "Complex, multi-constraint or trade-off-heavy tasks.",
    instruction:
      "Reason through the key decisions and trade-offs before producing the final output.",
  },
  {
    key: "output-automater",
    name: "Output Automater Pattern",
    description:
      "Request a directly usable artifact (file, brief, spec) rather than prose about one.",
    whenToUse: "Deliverables meant to be pasted or executed as-is.",
    instruction:
      "Produce a directly usable artifact. Do not wrap it in commentary or preamble.",
  },
  {
    key: "audience",
    name: "Audience Pattern",
    description:
      "Tailor vocabulary, depth and framing to a specific, named audience.",
    whenToUse: "Content, marketing and anything read by a defined persona.",
    instruction:
      "Write for the specified audience — match their vocabulary, depth and concerns.",
  },
  {
    key: "constraint",
    name: "Constraint Pattern",
    description: "Enforce explicit boundaries the output must never cross.",
    whenToUse: "Legal, brand, compliance and safety-sensitive work.",
    instruction:
      "Respect every stated boundary as a hard limit; if a request conflicts with a constraint, the constraint wins.",
  },
];

export const PATTERN_MAP: Record<string, PatternDef> = Object.fromEntries(
  PROMPT_PATTERNS.map((p) => [p.key, p]),
);

export type Technique = "zero-shot" | "few-shot" | "chain-of-thought" | "react";

export const TECHNIQUE_INSTRUCTIONS: Record<Technique, string> = {
  "zero-shot": "Complete the task directly using the context provided.",
  "few-shot": "Use the worked examples above as the pattern to follow.",
  "chain-of-thought":
    "Think step by step. Reason through the constraints and trade-offs, then give the final answer.",
  react:
    "Work in Reason → Act cycles: state your reasoning, take the next concrete step, then continue — surfacing assumptions as you go.",
};
