import type { DepartmentSeed } from "./types";

export const qaTesting: DepartmentSeed = {
  order: 1,
  config: {
    key: "qa-testing",
    name: "QA / Testing",
    description: "Turn a feature into a risk-based test plan, test cases, or automation prompt.",
    icon: "QA",
    persona:
      "a senior QA engineer who writes precise, risk-based test plans and reliable automated tests",
    patterns: ["persona", "template", "flipped-interaction"],
    useCases: [
      { id: "test-cases", name: "Test cases" },
      { id: "test-plan", name: "Test plan" },
      { id: "automation", name: "Automation suite" },
      { id: "bug-report", name: "Bug report" },
    ],
    outputFormats: [
      {
        value: "test-cases",
        label: "Test case suite",
        technique: "zero-shot",
        instruction:
          "Produce a structured test-case suite: for each case give an ID, title, preconditions, steps, test data and expected result, grouped by test type.",
      },
      {
        value: "test-plan",
        label: "Test plan",
        technique: "chain-of-thought",
        instruction:
          "Produce a risk-based test plan: scope, test types, risk areas and priorities, entry/exit criteria, environment and data needs, and a rough schedule.",
      },
      {
        value: "automation",
        label: "Automation build prompt",
        technique: "react",
        instruction:
          "Produce a build prompt for an automated test suite: framework setup, the cases to automate, a selector/fixture strategy, and CI integration.",
      },
    ],
    defaultOutputFormat: "test-cases",
    steps: [
      {
        id: "target",
        title: "What are you testing?",
        description: "The feature and how you'll judge it passing.",
        fields: [
          {
            id: "useCase",
            label: "Deliverable",
            type: "segment",
            slot: "context",
            required: true,
            help: "Tunes the structure and technique.",
            options: [
              { value: "test-cases", label: "Test cases" },
              { value: "test-plan", label: "Test plan" },
              { value: "automation", label: "Automation suite" },
              { value: "bug-report", label: "Bug report" },
            ],
          },
          {
            id: "featureUnderTest",
            label: "Feature under test",
            type: "textarea",
            slot: "task",
            required: true,
            placeholder: "e.g. Password reset via email link…",
            help: "What behaviour needs testing.",
            max: 600,
          },
          {
            id: "acceptanceCriteria",
            label: "Acceptance criteria",
            type: "textarea",
            slot: "task",
            placeholder: "The conditions that define 'working'…",
            help: "Every test should trace back to one of these.",
            max: 600,
            clarifyPrompt: "What's the single condition that must hold for this to count as working?",
          },
        ],
      },
      {
        id: "scope",
        title: "Scope & risk",
        fields: [
          {
            id: "testTypes",
            label: "Test types",
            type: "multiselect",
            slot: "task",
            options: [
              { value: "Unit", label: "Unit" },
              { value: "Integration", label: "Integration" },
              { value: "End-to-end", label: "End-to-end" },
              { value: "Regression", label: "Regression" },
              { value: "Performance", label: "Performance" },
              { value: "Security", label: "Security" },
              { value: "Accessibility", label: "Accessibility" },
            ],
          },
          {
            id: "riskAreas",
            label: "Risk areas",
            type: "chips",
            slot: "constraint",
            placeholder: "Add a risky area and press Enter",
            help: "Where bugs would hurt most — these get prioritised.",
            clarifyPrompt: "Where would a bug hurt the most if it slipped through?",
          },
          {
            id: "needsAutomation",
            label: "Automate these tests?",
            type: "toggle",
            slot: "context",
            default: true,
          },
          {
            id: "automationFramework",
            label: "Automation framework",
            type: "multiselect",
            slot: "context",
            allowOther: true,
            showIf: { field: "needsAutomation", equals: true },
            options: [
              { value: "Playwright", label: "Playwright" },
              { value: "Cypress", label: "Cypress" },
              { value: "Jest", label: "Jest" },
              { value: "Vitest", label: "Vitest" },
              { value: "Selenium", label: "Selenium" },
              { value: "Pytest", label: "Pytest" },
              { value: "JUnit", label: "JUnit" },
            ],
          },
        ],
      },
      {
        id: "data",
        title: "Data & constraints",
        fields: [
          {
            id: "testDataConstraints",
            label: "Test data constraints",
            type: "textarea",
            slot: "constraint",
            placeholder: "Data shapes, fixtures, or what must be avoided…",
            max: 500,
            clarifyPrompt: "Any specific data shapes or fixtures the tests should use — or avoid?",
          },
          {
            id: "referenceExample",
            label: "Reference example",
            type: "textarea",
            slot: "example",
            placeholder: "Optional: paste an existing test whose style to imitate.",
            help: "Providing an example switches the engine to few-shot.",
            max: 1500,
          },
        ],
      },
    ],
  },
  compliance: [
    {
      code: "QA-001",
      label: "Deterministic tests",
      description:
        "Tests must be deterministic — no reliance on timing, order, or live external services.",
    },
    {
      code: "QA-002",
      label: "Edge & negative cases",
      description:
        "Include boundary, empty and negative-path cases, not just the happy path.",
    },
    {
      code: "QA-003",
      label: "No production data",
      description: "Never use real customer or production data as test data.",
    },
    {
      code: "QA-004",
      label: "Traceability",
      description: "Every test case must trace to an acceptance criterion or requirement.",
    },
  ],
};
