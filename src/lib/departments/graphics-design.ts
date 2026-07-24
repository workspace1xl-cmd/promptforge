import type { DepartmentSeed } from "./types";

export const graphicsDesign: DepartmentSeed = {
  order: 3,
  config: {
    key: "graphics-design",
    name: "Graphics / Design",
    description: "Turn a request into a buildable design brief or a detailed image-gen prompt.",
    icon: "DESIGN",
    persona:
      "a senior product and brand designer who writes precise, buildable design briefs",
    patterns: ["persona", "output-automater", "constraint"],
    useCases: [
      { id: "brief", name: "Design brief" },
      { id: "social-asset", name: "Social asset" },
      { id: "ui-screen", name: "UI screen" },
      { id: "brand-asset", name: "Brand asset" },
      { id: "illustration", name: "Illustration" },
    ],
    outputFormats: [
      {
        value: "design-brief",
        label: "Design brief",
        technique: "zero-shot",
        instruction:
          "Produce a design brief: objective, deliverable and specs, visual direction, must-use brand elements, do/don't, and acceptance criteria.",
      },
      {
        value: "image-prompt",
        label: "Image-gen prompt",
        technique: "zero-shot",
        instruction:
          "Produce a detailed image-generation prompt: subject, style, composition, colour, lighting, mood, aspect ratio, and negative prompts.",
      },
    ],
    defaultOutputFormat: "design-brief",
    steps: [
      {
        id: "deliverable",
        title: "The deliverable",
        fields: [
          {
            id: "useCase",
            label: "Type",
            type: "segment",
            slot: "context",
            required: true,
            options: [
              { value: "brief", label: "Design brief" },
              { value: "social-asset", label: "Social asset" },
              { value: "ui-screen", label: "UI screen" },
              { value: "brand-asset", label: "Brand asset" },
              { value: "illustration", label: "Illustration" },
            ],
          },
          {
            id: "deliverableType",
            label: "What are we making?",
            type: "text",
            slot: "task",
            required: true,
            placeholder: "e.g. Instagram launch carousel, 5 slides",
            max: 200,
          },
          {
            id: "purpose",
            label: "Purpose",
            type: "textarea",
            slot: "task",
            placeholder: "What it's for and what it must communicate…",
            max: 400,
            clarifyPrompt: "What's the one thing this design must communicate at a glance?",
          },
        ],
      },
      {
        id: "brand",
        title: "Brand & specs",
        fields: [
          {
            id: "brandKit",
            label: "Brand kit",
            type: "textarea",
            slot: "context",
            placeholder: "Colours, fonts, logo rules…",
            help: "The generated brief will treat these as fixed.",
            max: 500,
            clarifyPrompt: "Any brand colours, fonts or logo rules this must follow?",
          },
          {
            id: "dimensions",
            label: "Dimensions / platform",
            type: "text",
            slot: "context",
            placeholder: "e.g. 1080×1080, Instagram feed",
            max: 160,
          },
          {
            id: "moodReferences",
            label: "Mood / references",
            type: "textarea",
            slot: "context",
            placeholder: "Styles, artists, or links that capture the feel…",
            max: 400,
            clarifyPrompt: "Any reference styles, artists or existing work that capture the feel you want?",
          },
        ],
      },
      {
        id: "constraints",
        title: "Constraints",
        fields: [
          {
            id: "accessibility",
            label: "Accessibility constraints",
            type: "multiselect",
            slot: "constraint",
            options: [
              { value: "AA colour contrast", label: "AA colour contrast" },
              { value: "Legible minimum text size", label: "Legible minimum text size" },
              { value: "Colour-blind safe", label: "Colour-blind safe" },
              { value: "Alt text provided", label: "Alt text provided" },
            ],
          },
          {
            id: "doDont",
            label: "Do's & don'ts",
            type: "chips",
            slot: "constraint",
            placeholder: "Add a rule and press Enter",
          },
          {
            id: "referenceExample",
            label: "Reference example",
            type: "textarea",
            slot: "example",
            placeholder: "Optional: describe or paste a brief whose quality to imitate.",
            max: 1200,
          },
        ],
      },
    ],
  },
  compliance: [
    {
      code: "DES-001",
      label: "Brand consistency",
      description:
        "Use only the provided brand colours, fonts and logo rules; never alter or recolour the logo.",
    },
    {
      code: "DES-002",
      label: "Accessible contrast",
      description: "Ensure text and essential elements meet WCAG AA contrast.",
    },
    {
      code: "DES-003",
      label: "Licensed assets only",
      description:
        "Use only licensed or original assets; no unlicensed stock or copyrighted material.",
    },
    {
      code: "DES-004",
      label: "Export to spec",
      description:
        "Deliver at the exact dimensions and format specified for the target platform.",
    },
  ],
};
