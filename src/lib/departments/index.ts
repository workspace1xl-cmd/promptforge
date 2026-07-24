import type { DepartmentSeed } from "./types";
import { softwareDevelopment } from "./software-development";
import { qaTesting } from "./qa-testing";
import { contentCopywriting } from "./content-copywriting";
import { graphicsDesign } from "./graphics-design";
import { humanResources } from "./hr";
import { marketing } from "./marketing";

// The department registry. Each entry is pure config — the generic wizard,
// engine and compliance handling render all of them with no per-department code.
export const DEPARTMENT_SEEDS: DepartmentSeed[] = [
  softwareDevelopment,
  qaTesting,
  contentCopywriting,
  graphicsDesign,
  humanResources,
  marketing,
];

export function getDepartmentSeed(key: string): DepartmentSeed | undefined {
  return DEPARTMENT_SEEDS.find((d) => d.config.key === key);
}
