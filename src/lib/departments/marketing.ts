import type { DepartmentSeed } from "./types";

export const marketing: DepartmentSeed = {
  order: 5,
  config: {
    key: "marketing",
    name: "Marketing",
    description: "Turn a goal into a data-informed campaign plan or channel-ready copy.",
    icon: "MKT",
    persona:
      "a growth marketing lead who writes data-informed, on-brand campaign plans and copy",
    patterns: ["persona", "audience", "output-automater"],
    useCases: [
      { id: "campaign-plan", name: "Campaign plan" },
      { id: "channel-copy", name: "Channel copy" },
      { id: "launch", name: "Product launch" },
      { id: "positioning", name: "Positioning" },
    ],
    outputFormats: [
      {
        value: "campaign-plan",
        label: "Campaign plan",
        technique: "chain-of-thought",
        instruction:
          "Produce a campaign plan: goal, audience, channels and tactics, messaging, KPIs and targets, timeline, and budget split.",
      },
      {
        value: "channel-copy",
        label: "Channel copy",
        technique: "zero-shot",
        instruction:
          "Produce channel-ready copy variants for the stated channel, each labelled with its placement.",
      },
    ],
    defaultOutputFormat: "campaign-plan",
    steps: [
      {
        id: "campaign",
        title: "The campaign",
        fields: [
          {
            id: "useCase",
            label: "Deliverable",
            type: "segment",
            slot: "context",
            required: true,
            options: [
              { value: "campaign-plan", label: "Campaign plan" },
              { value: "channel-copy", label: "Channel copy" },
              { value: "launch", label: "Product launch" },
              { value: "positioning", label: "Positioning" },
            ],
          },
          {
            id: "goal",
            label: "Campaign goal",
            type: "textarea",
            slot: "task",
            required: true,
            placeholder: "e.g. 500 trial sign-ups in Q3 from mid-market SaaS teams",
            help: "Be specific — a measurable goal shapes the whole plan.",
            max: 400,
          },
          {
            id: "audience",
            label: "Target audience",
            type: "textarea",
            slot: "audience",
            required: true,
            placeholder: "Who you're reaching and what moves them…",
            max: 400,
          },
        ],
      },
      {
        id: "channels",
        title: "Channels & targets",
        fields: [
          {
            id: "channels",
            label: "Channels",
            type: "multiselect",
            slot: "context",
            allowOther: true,
            options: [
              { value: "Email", label: "Email" },
              { value: "Paid search", label: "Paid search" },
              { value: "Paid social", label: "Paid social" },
              { value: "SEO / content", label: "SEO / content" },
              { value: "Influencer", label: "Influencer" },
              { value: "Events", label: "Events" },
              { value: "PR", label: "PR" },
            ],
          },
          {
            id: "budgetTier",
            label: "Budget tier",
            type: "segment",
            slot: "context",
            options: [
              { value: "Lean", label: "Lean" },
              { value: "Moderate", label: "Moderate" },
              { value: "Aggressive", label: "Aggressive" },
            ],
          },
          {
            id: "kpis",
            label: "KPIs / targets",
            type: "chips",
            slot: "task",
            placeholder: "Add a KPI and press Enter",
            clarifyPrompt: "What number will tell you this campaign worked?",
          },
        ],
      },
      {
        id: "brand",
        title: "Brand & competition",
        fields: [
          {
            id: "brandGuardrails",
            label: "Brand guardrails",
            type: "textarea",
            slot: "constraint",
            placeholder: "Voice, claims to avoid, legal lines…",
            max: 400,
            clarifyPrompt: "Any claims or lines the brand must never cross?",
          },
          {
            id: "competitorPositioning",
            label: "Competitor positioning",
            type: "textarea",
            slot: "context",
            placeholder: "How competitors position, and where you differ…",
            max: 400,
            clarifyPrompt: "Who's the main competitor here, and where do you win against them?",
          },
          {
            id: "referenceExample",
            label: "Reference example",
            type: "textarea",
            slot: "example",
            placeholder: "Optional: paste a campaign whose quality to imitate.",
            max: 1500,
          },
        ],
      },
    ],
  },
  compliance: [
    {
      code: "MKT-001",
      label: "Truthful claims",
      description:
        "All claims must be truthful and substantiated; no misleading or unverifiable statements.",
    },
    {
      code: "MKT-002",
      label: "Regulatory compliance",
      description:
        "Follow advertising and channel rules — disclosures for paid/affiliate, platform ad policies.",
    },
    {
      code: "MKT-003",
      label: "On brand",
      description: "Respect the brand guardrails and voice.",
    },
    {
      code: "MKT-004",
      label: "Respect privacy",
      description:
        "Respect privacy and consent rules; no targeting or claims that misuse personal data.",
    },
  ],
};
