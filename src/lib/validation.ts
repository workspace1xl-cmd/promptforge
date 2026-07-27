import { z } from "zod";
import type { Answers, DepartmentConfig } from "@/lib/departments/types";
import { allFields, hasValue, isFieldVisible } from "@/lib/engine/assemble";

// Mirrors the AnswerValue type with real bounds. The client UI already caps
// every field's length (see each department's FieldDef.max), but that's a
// UI convenience, not a security boundary — this is what actually stops an
// oversized payload sent straight to the API (bypassing the wizard) from
// bloating storage, the AI provider call, or an unbounded PDF/DOCX export.
const answerValueSchema = z.union([
  z.string().max(10_000),
  z.array(z.string().max(2_000)).max(200),
  z.boolean(),
  z.number(),
]);
export const answersSchema = z
  .record(z.string(), answerValueSchema)
  .refine((v) => Object.keys(v).length <= 80, "Too many fields in answers.");

export const shortId = z.string().min(1).max(100);

// zod validates the request envelope on both client and server.
export const generateRequestSchema = z.object({
  departmentKey: shortId,
  useCase: shortId,
  outputFormat: shortId,
  verbosity: z.enum(["concise", "balanced", "detailed"]).default("balanced"),
  rigor: z.enum(["guidance", "strict"]).default("guidance"),
  refine: z.string().max(2000).optional(),
  answers: answersSchema,
  saveTemplateName: z.string().max(80).optional(),
  clarifications: z
    .array(z.object({ question: z.string().min(1).max(300), answer: z.string().max(800) }))
    .max(5)
    .optional(),
  submissionId: shortId.optional(),
});

export const clarifyRequestSchema = z.object({
  departmentKey: shortId,
  answers: answersSchema,
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** Required, currently-visible fields that are still empty. */
export function missingRequired(
  config: DepartmentConfig,
  answers: Answers,
): { id: string; label: string }[] {
  return allFields(config)
    .filter(
      (f) => f.required && isFieldVisible(f, answers) && !hasValue(answers[f.id]),
    )
    .map((f) => ({ id: f.id, label: f.label }));
}
