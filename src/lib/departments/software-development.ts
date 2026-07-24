import type { DepartmentSeed } from "./types";

// Phase 0 department. Everything the renderer needs lives in this object — the
// wizard, branching logic, compliance and prompt shaping are all data.
export const softwareDevelopment: DepartmentSeed = {
  order: 0,
  config: {
    key: "software-development",
    name: "Software Development",
    description:
      "Turn a feature idea into a production-ready build prompt, PRD or engineering brief.",
    icon: "DEV",
    persona:
      "a senior staff software engineer who writes clean, secure, production-ready code and clear technical documents",
    patterns: ["persona", "recipe", "template", "output-automater"],
    useCases: [
      { id: "feature", name: "Feature / product build" },
      { id: "integration", name: "API / integration" },
      { id: "refactor", name: "Refactor / tech-debt" },
      { id: "spec", name: "Technical spec / design doc" },
    ],
    outputFormats: [
      {
        value: "build-prompt",
        label: "Codex-style build prompt",
        technique: "react",
        instruction:
          "Produce a Codex-style build prompt an autonomous coding agent can execute: a clear objective, an ordered task breakdown, the tech stack, acceptance criteria, and a working agreement (plan first, work in small verifiable steps).",
      },
      {
        value: "prd",
        label: "Product requirements doc (PRD)",
        technique: "chain-of-thought",
        instruction:
          "Produce a product requirements document: problem, goals, non-goals, requirements, success metrics and open questions.",
      },
      {
        value: "sop",
        label: "Engineering SOP / brief",
        technique: "zero-shot",
        instruction:
          "Produce an engineering SOP / brief: purpose, scope, prerequisites, numbered procedure and checks.",
      },
      {
        value: "all",
        label: "All three",
        technique: "react",
        instruction:
          "Produce three clearly separated sections: (1) a PRD, (2) a Codex-style build prompt, and (3) a short SOP / brief.",
      },
    ],
    defaultOutputFormat: "build-prompt",
    steps: [
      {
        id: "problem",
        title: "What are you building?",
        description: "The problem in plain language — no jargon needed.",
        fields: [
          {
            id: "useCase",
            label: "Type of work",
            type: "segment",
            slot: "context",
            required: true,
            help: "Pick the closest match; it tunes the technique and structure.",
            options: [
              { value: "feature", label: "Feature / product build" },
              { value: "integration", label: "API / integration" },
              { value: "refactor", label: "Refactor / tech-debt" },
              { value: "spec", label: "Technical spec / design doc" },
            ],
          },
          {
            id: "problemStatement",
            label: "What problem does this solve?",
            type: "textarea",
            slot: "task",
            required: true,
            placeholder:
              "e.g. Users can't reset their password without contacting support…",
            help: "Describe what's broken or missing, and for whom. This becomes the core objective.",
            max: 800,
          },
          {
            id: "targetUsers",
            label: "Who is it for?",
            type: "text",
            slot: "audience",
            placeholder: "e.g. Self-serve SMB admins on mobile",
            help: "The intended users. Decisions get tailored to them.",
            max: 160,
            clarifyPrompt: "Who is the primary user of this, and what do they already know?",
          },
        ],
      },
      {
        id: "stack",
        title: "Surface & stack",
        description: "Only the parts that apply — fields appear as you answer.",
        fields: [
          {
            id: "needsUI",
            label: "Does this have a user interface?",
            type: "toggle",
            slot: "context",
            default: true,
            help: "Turn off for pure back-end, CLI or data work.",
          },
          {
            id: "frontend",
            label: "Front-end stack",
            type: "multiselect",
            slot: "context",
            allowOther: true,
            showIf: { field: "needsUI", equals: true },
            help: "Frameworks in play. Pick any; add your own with “Other”.",
            options: [
              { value: "React", label: "React" },
              { value: "Next.js", label: "Next.js" },
              { value: "Vue", label: "Vue" },
              { value: "Svelte", label: "Svelte" },
              { value: "Angular", label: "Angular" },
              { value: "React Native", label: "React Native" },
              { value: "Flutter", label: "Flutter" },
            ],
          },
          {
            id: "uiux",
            label: "UI / UX preferences",
            type: "textarea",
            slot: "context",
            showIf: { field: "needsUI", equals: true },
            placeholder: "Design system, brand, accessibility needs, key screens…",
            max: 500,
          },
          {
            id: "needsBackend",
            label: "Does it need a back end or infrastructure?",
            type: "toggle",
            slot: "context",
            default: true,
            help: "Turn on to specify server, database and hosting.",
          },
          {
            id: "backend",
            label: "Back-end stack",
            type: "multiselect",
            slot: "context",
            allowOther: true,
            showIf: { field: "needsBackend", equals: true },
            options: [
              { value: "Node / Express", label: "Node / Express" },
              { value: "Next.js API routes", label: "Next.js API routes" },
              { value: "NestJS", label: "NestJS" },
              { value: "Django", label: "Django" },
              { value: "FastAPI", label: "FastAPI" },
              { value: "Rails", label: "Rails" },
              { value: "Go", label: "Go" },
              { value: "Spring", label: "Spring" },
            ],
          },
          {
            id: "database",
            label: "Database",
            type: "multiselect",
            slot: "context",
            allowOther: true,
            showIf: { field: "needsBackend", equals: true },
            options: [
              { value: "PostgreSQL", label: "PostgreSQL" },
              { value: "MySQL", label: "MySQL" },
              { value: "MongoDB", label: "MongoDB" },
              { value: "SQLite", label: "SQLite" },
              { value: "Redis", label: "Redis" },
              { value: "DynamoDB", label: "DynamoDB" },
            ],
          },
          {
            id: "hosting",
            label: "Hosting / deploy target",
            type: "multiselect",
            slot: "context",
            allowOther: true,
            showIf: { field: "needsBackend", equals: true },
            help: "Where it will run. Shapes infra and config choices.",
            options: [
              { value: "Vercel", label: "Vercel" },
              { value: "Netlify", label: "Netlify" },
              { value: "AWS", label: "AWS" },
              { value: "GCP", label: "GCP" },
              { value: "Azure", label: "Azure" },
              { value: "Fly.io", label: "Fly.io" },
              { value: "Railway", label: "Railway" },
              { value: "Render", label: "Render" },
            ],
          },
          {
            id: "architecture",
            label: "Architecture style",
            type: "segment",
            slot: "context",
            showIf: { field: "needsBackend", equals: true },
            options: [
              { value: "Monolith", label: "Monolith" },
              { value: "Modular monolith", label: "Modular monolith" },
              { value: "Microservices", label: "Microservices" },
              { value: "Serverless", label: "Serverless" },
            ],
          },
        ],
      },
      {
        id: "quality",
        title: "Quality bar",
        description: "Constraints and standards the result must respect.",
        fields: [
          {
            id: "nfr",
            label: "Non-functional requirements",
            type: "multiselect",
            slot: "constraint",
            help: "What must hold true beyond “it works”.",
            clarifyPrompt:
              "Which non-functional requirement matters most here — performance, security, or something else?",
            options: [
              { value: "High performance", label: "High performance" },
              { value: "Strong security", label: "Strong security" },
              { value: "High availability", label: "High availability" },
              { value: "Scalability", label: "Scalability" },
              { value: "Low latency", label: "Low latency" },
              { value: "Offline support", label: "Offline support" },
              { value: "Internationalisation", label: "Internationalisation" },
            ],
          },
          {
            id: "codingStandards",
            label: "Coding standards / SOP to enforce",
            type: "textarea",
            slot: "constraint",
            placeholder:
              "Paste house rules: naming, testing policy, review gates, dependencies to avoid…",
            help: "Pasted rules become hard constraints in the generated prompt.",
            max: 1500,
            clarifyPrompt:
              "Any house coding standards to assume, or should PromptForge use general best practice?",
          },
          {
            id: "referenceExample",
            label: "Reference example",
            type: "textarea",
            slot: "example",
            placeholder: "Optional: paste a prior artifact whose quality to imitate.",
            help: "Providing an example switches the engine to the few-shot technique.",
            max: 1500,
          },
        ],
      },
    ],
  },
  compliance: [
    {
      code: "SEC-001",
      label: "No secrets in code",
      description:
        "Never hard-code secrets, API keys or credentials; read them from environment variables.",
    },
    {
      code: "SEC-002",
      label: "Validate all input",
      description: "Validate and sanitise every external input on the server side.",
    },
    {
      code: "QUAL-001",
      label: "Test the critical paths",
      description:
        "Include or specify tests for the critical paths of any non-trivial logic.",
    },
    {
      code: "QUAL-002",
      label: "Flag breaking changes",
      description:
        "Call out any breaking change or required migration explicitly.",
    },
    {
      code: "A11Y-001",
      label: "Accessible UI",
      description:
        "Any user interface must meet WCAG AA — labels, visible focus, and sufficient colour contrast.",
    },
    {
      code: "DOC-001",
      label: "State assumptions",
      description: "Document assumptions and any non-obvious decisions.",
    },
  ],
};
