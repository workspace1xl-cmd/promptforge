import type { DepartmentSeed } from "./types";
import { softwareDevelopment } from "./software-development";

// The department registry. Phase 1 adds new departments here (config only) —
// QA/Testing, Content, Graphics/Design, HR, Marketing — with no new UI code.
export const DEPARTMENT_SEEDS: DepartmentSeed[] = [softwareDevelopment];

export function getDepartmentSeed(key: string): DepartmentSeed | undefined {
  return DEPARTMENT_SEEDS.find((d) => d.config.key === key);
}
