// "Clarify before generating" — the Flipped Interaction pattern. When a brief
// is thin, PromptForge asks 2-3 targeted follow-up questions before forging
// the final artifact, instead of quietly filling gaps with assumptions.

import type { Answers, DepartmentConfig } from "@/lib/departments/types";
import { allFields, hasValue, isFieldVisible } from "./assemble";

export interface ClarifyQuestion {
  fieldId: string;
  question: string;
}

const MAX_QUESTIONS = 3;

/** Up to three unanswered, clarify-worthy fields, in wizard order. */
export function getClarifyingQuestions(
  config: DepartmentConfig,
  answers: Answers,
): ClarifyQuestion[] {
  return allFields(config)
    .filter(
      (f) =>
        f.clarifyPrompt &&
        isFieldVisible(f, answers) &&
        !hasValue(answers[f.id]),
    )
    .slice(0, MAX_QUESTIONS)
    .map((f) => ({ fieldId: f.id, question: f.clarifyPrompt! }));
}

/**
 * A brief counts as "underspecified" when there are gaps worth asking about
 * AND the form as a whole is thinly filled — a well-filled brief that simply
 * skipped one optional field shouldn't get interrupted.
 */
export function isUnderspecified(config: DepartmentConfig, answers: Answers): boolean {
  const questions = getClarifyingQuestions(config, answers);
  if (questions.length === 0) return false;

  const visible = allFields(config).filter(
    (f) => f.id !== "useCase" && isFieldVisible(f, answers),
  );
  const filled = visible.filter((f) => hasValue(answers[f.id]));
  const fillRatio = visible.length ? filled.length / visible.length : 1;

  return fillRatio < 0.5;
}
