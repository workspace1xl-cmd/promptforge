import type { DepartmentSeed } from "./types";

export const contentCopywriting: DepartmentSeed = {
  order: 2,
  config: {
    key: "content-copywriting",
    name: "Content / Copywriting",
    description: "Turn a topic into on-brand, audience-first copy — draft, outline, or variants.",
    icon: "CONTENT",
    persona:
      "a senior content strategist and copywriter who writes on-brand, audience-first copy",
    patterns: ["persona", "audience", "template"],
    useCases: [
      { id: "blog", name: "Blog / article" },
      { id: "ad", name: "Ad copy" },
      { id: "email", name: "Email" },
      { id: "social", name: "Social post" },
      { id: "landing", name: "Landing page" },
    ],
    outputFormats: [
      {
        value: "draft",
        label: "Finished draft",
        technique: "zero-shot",
        instruction:
          "Produce a finished, ready-to-publish draft in the requested content type and length.",
      },
      {
        value: "outline",
        label: "Outline",
        technique: "zero-shot",
        instruction:
          "Produce a structured outline with section headers and the key point for each section.",
      },
      {
        value: "variants",
        label: "3 variants",
        technique: "zero-shot",
        instruction:
          "Produce three distinct variants, each labelled and ready to use.",
      },
    ],
    defaultOutputFormat: "draft",
    steps: [
      {
        id: "piece",
        title: "The piece",
        fields: [
          {
            id: "useCase",
            label: "Content type",
            type: "segment",
            slot: "context",
            required: true,
            options: [
              { value: "blog", label: "Blog / article" },
              { value: "ad", label: "Ad copy" },
              { value: "email", label: "Email" },
              { value: "social", label: "Social post" },
              { value: "landing", label: "Landing page" },
            ],
          },
          {
            id: "topic",
            label: "Topic",
            type: "text",
            slot: "task",
            required: true,
            placeholder: "e.g. Announcing our new pricing plans",
            max: 200,
          },
          {
            id: "goal",
            label: "What should it achieve?",
            type: "text",
            slot: "task",
            placeholder: "e.g. Drive sign-ups for the free trial",
            help: "The one action or outcome the copy should drive.",
            max: 200,
            clarifyPrompt: "What's the one action you want the reader to take after reading this?",
          },
        ],
      },
      {
        id: "voice",
        title: "Audience & voice",
        fields: [
          {
            id: "audiencePersona",
            label: "Audience",
            type: "textarea",
            slot: "audience",
            required: true,
            placeholder: "Who are they, what do they care about, what do they know?",
            help: "The copy is tailored to this persona.",
            max: 400,
          },
          {
            id: "brandVoice",
            label: "Brand voice",
            type: "textarea",
            slot: "context",
            placeholder: "Tone, style, phrases to use or avoid…",
            max: 400,
            clarifyPrompt: "How would you describe the brand's voice in a sentence?",
          },
          {
            id: "tone",
            label: "Tone",
            type: "segment",
            slot: "constraint",
            options: [
              { value: "Neutral", label: "Neutral" },
              { value: "Friendly", label: "Friendly" },
              { value: "Bold", label: "Bold" },
              { value: "Authoritative", label: "Authoritative" },
              { value: "Playful", label: "Playful" },
            ],
          },
        ],
      },
      {
        id: "seo",
        title: "SEO & guardrails",
        fields: [
          {
            id: "seoKeywords",
            label: "SEO keywords",
            type: "chips",
            slot: "context",
            placeholder: "Add a keyword and press Enter",
          },
          {
            id: "dosAndDonts",
            label: "Do's & don'ts",
            type: "chips",
            slot: "constraint",
            placeholder: "Add a rule and press Enter",
            clarifyPrompt: "Is there anything this copy must never say or imply?",
          },
          {
            id: "length",
            label: "Length",
            type: "segment",
            slot: "constraint",
            options: [
              { value: "Short", label: "Short" },
              { value: "Standard", label: "Standard" },
              { value: "Long", label: "Long" },
            ],
          },
          {
            id: "competitorExamples",
            label: "Reference example",
            type: "textarea",
            slot: "example",
            placeholder: "Optional: paste copy whose quality to imitate (not copy).",
            max: 1500,
          },
        ],
      },
    ],
  },
  compliance: [
    {
      code: "CON-001",
      label: "On brand",
      description:
        "Match the brand voice exactly; never contradict the brand guidelines provided.",
    },
    {
      code: "CON-002",
      label: "No unverifiable claims",
      description: "Do not invent statistics, testimonials or claims that were not provided.",
    },
    {
      code: "CON-003",
      label: "Original copy",
      description:
        "Write original copy; use competitor examples only as reference, never as source to copy.",
    },
    {
      code: "CON-004",
      label: "Inclusive language",
      description: "Use inclusive, bias-free language.",
    },
  ],
};
