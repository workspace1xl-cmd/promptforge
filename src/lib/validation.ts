import { z } from "zod";
import type { Answers, DepartmentConfig } from "@/lib/departments/types";
import { allFields, hasValue, isFieldVisible } from "@/lib/engine/assemble";

// zod validates the request envelope on both client and server.
export const generateRequestSchema = z.object({
  departmentKey: z.string().min(1),
  useCase: z.string().min(1),
  outputFormat: z.string().min(1),
  verbosity: z.enum(["concise", "balanced", "detailed"]).default("balanced"),
  rigor: z.enum(["guidance", "strict"]).default("guidance"),
  refine: z.string().max(2000).optional(),
  answers: z.record(z.string(), z.any()),
  saveTemplateName: z.string().max(80).optional(),
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
