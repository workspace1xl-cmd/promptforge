// Applies admin-configured FieldOverride rows onto a department's static
// config at read time. Pure and isomorphic — the caller fetches the DB rows;
// this just merges them in. Used by both the wizard page (so locked fields
// never render) and the generate route (so a client can't bypass a lock or a
// required-override by omitting it from the request).

import type { Answers, DepartmentConfig, FieldDef } from "./types";
import { LOCKABLE_FIELD_TYPES } from "./types";

export interface FieldOverrideRow {
  fieldId: string;
  required: boolean | null;
  locked: boolean;
  lockedValue: unknown;
}

function applyToField(field: FieldDef, override: FieldOverrideRow | undefined): FieldDef {
  if (!override) return field;
  const next: FieldDef = { ...field };
  if (override.required !== null && override.required !== undefined) {
    next.required = override.required;
  }
  if (override.locked && LOCKABLE_FIELD_TYPES.includes(field.type)) {
    next.adminLocked = true;
    next.default = override.lockedValue as FieldDef["default"];
    next.required = false; // a locked field is always satisfied — never block on it
  }
  return next;
}

export function applyFieldOverrides(
  config: DepartmentConfig,
  overrides: FieldOverrideRow[],
): DepartmentConfig {
  if (!overrides.length) return config;
  const byId = new Map(overrides.map((o) => [o.fieldId, o]));
  return {
    ...config,
    steps: config.steps.map((step) => ({
      ...step,
      fields: step.fields.map((f) => applyToField(f, byId.get(f.id))),
    })),
  };
}

/** Ensures every admin-locked field's fixed value is present, regardless of what the client sent. */
export function enforceLockedAnswers(config: DepartmentConfig, answers: Answers): Answers {
  const merged = { ...answers };
  for (const step of config.steps) {
    for (const f of step.fields) {
      if (f.adminLocked && f.default !== undefined) merged[f.id] = f.default;
    }
  }
  return merged;
}
