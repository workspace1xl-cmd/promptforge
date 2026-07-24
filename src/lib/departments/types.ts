// Config-driven department + form model. Adding a department = adding one of
// these objects (seeded into the DB) — no new React components required.

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "segment"
  | "toggle"
  | "chips"
  | "number";

// Which part of the assembled meta-prompt an answer feeds.
export type FieldSlot =
  | "task"
  | "context"
  | "constraint"
  | "format"
  | "example"
  | "persona"
  | "audience";

export interface FieldOption {
  value: string;
  label: string;
}

export interface ShowIf {
  field: string;
  equals?: string | number | boolean;
  in?: string[];
  truthy?: boolean;
}

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  slot: FieldSlot;
  placeholder?: string;
  /** Plain-English "why we're asking this" — shown as a tooltip. */
  help?: string;
  required?: boolean;
  options?: FieldOption[];
  /** For select/multiselect: allow a free-text "Other" entry. */
  allowOther?: boolean;
  min?: number;
  max?: number;
  showIf?: ShowIf;
  /** Smart default applied when the form first loads. */
  default?: AnswerValue;
  /**
   * Marks this field as worth a follow-up question when left empty and the
   * brief is otherwise thin (Flipped Interaction pattern). The text is the
   * plain-English question asked in the pre-generation clarify step.
   */
  clarifyPrompt?: string;
}

export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
}

export interface UseCase {
  id: string;
  name: string;
  description?: string;
}

/** A desired output artifact, with the instruction + technique that shape it. */
export interface OutputFormatDef {
  value: string;
  label: string;
  /** How the model should shape this artifact (fed into the FORMAT section). */
  instruction: string;
  /** Preferred technique for this artifact; overrides the complexity heuristic. */
  technique?: "zero-shot" | "few-shot" | "chain-of-thought" | "react";
}

export interface DepartmentConfig {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Role/system persona used when assembling generated prompts. */
  persona: string;
  /** Prompt-pattern keys this department leans on (see engine/patterns.ts). */
  patterns: string[];
  useCases: UseCase[];
  steps: WizardStep[];
  /** Desired output artifact choices (PRD / build prompt / SOP / …). */
  outputFormats: OutputFormatDef[];
  defaultOutputFormat: string;
}

export interface ComplianceRuleDef {
  code: string;
  label: string;
  description: string;
  severity?: "hard" | "soft";
}

export interface DepartmentSeed {
  order: number;
  config: DepartmentConfig;
  compliance: ComplianceRuleDef[];
}

export type AnswerValue = string | string[] | boolean | number | undefined;
export type Answers = Record<string, AnswerValue>;

export interface GenerateOptions {
  useCase: string;
  outputFormat: string;
  verbosity: "concise" | "balanced" | "detailed";
  rigor: "guidance" | "strict";
  refine?: string;
  /** Answers to the pre-generation clarify step (Flipped Interaction pattern). */
  clarifications?: { question: string; answer: string }[];
  /**
   * Forces a specific technique instead of the usual selection heuristic.
   * Used by the A/B variant generator to make variant B genuinely different
   * from variant A, not just cosmetically reworded.
   */
  techniqueOverride?: "zero-shot" | "few-shot" | "chain-of-thought" | "react";
}
