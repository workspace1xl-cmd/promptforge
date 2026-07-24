import type { DepartmentSeed } from "./types";

export const humanResources: DepartmentSeed = {
  order: 4,
  config: {
    key: "hr",
    name: "HR",
    description: "Turn a people need into a clear, compliant, empathetic document.",
    icon: "HR",
    persona:
      "an experienced HR / People Operations specialist who writes clear, compliant, empathetic people documents",
    patterns: ["persona", "constraint", "template"],
    useCases: [
      { id: "policy", name: "Policy" },
      { id: "job-description", name: "Job description" },
      { id: "offer-comms", name: "Offer / comms" },
      { id: "review", name: "Performance review" },
      { id: "interview-guide", name: "Interview guide" },
    ],
    outputFormats: [
      {
        value: "document",
        label: "Policy / document",
        technique: "zero-shot",
        instruction:
          "Produce the document: purpose, scope, the policy or details, and an FAQ where useful.",
      },
      {
        value: "job-description",
        label: "Job description",
        technique: "zero-shot",
        instruction:
          "Produce a job description: summary, responsibilities, requirements and about the team.",
      },
    ],
    defaultOutputFormat: "document",
    steps: [
      {
        id: "need",
        title: "What do you need?",
        fields: [
          {
            id: "useCase",
            label: "Document",
            type: "segment",
            slot: "context",
            required: true,
            options: [
              { value: "policy", label: "Policy" },
              { value: "job-description", label: "Job description" },
              { value: "offer-comms", label: "Offer / comms" },
              { value: "review", label: "Performance review" },
              { value: "interview-guide", label: "Interview guide" },
            ],
          },
          {
            id: "policyArea",
            label: "Topic / area",
            type: "text",
            slot: "task",
            required: true,
            placeholder: "e.g. Remote-work policy, Senior Engineer role…",
            max: 200,
          },
          {
            id: "audience",
            label: "Who is it for?",
            type: "text",
            slot: "audience",
            placeholder: "e.g. All UK employees",
            max: 160,
            clarifyPrompt: "Who exactly will read this document?",
          },
        ],
      },
      {
        id: "toneConf",
        title: "Tone & confidentiality",
        fields: [
          {
            id: "tone",
            label: "Tone",
            type: "segment",
            slot: "constraint",
            options: [
              { value: "Formal", label: "Formal" },
              { value: "Empathetic", label: "Empathetic" },
              { value: "Neutral", label: "Neutral" },
            ],
          },
          {
            id: "confidentiality",
            label: "Confidentiality level",
            type: "segment",
            slot: "constraint",
            options: [
              { value: "Public", label: "Public" },
              { value: "Internal", label: "Internal" },
              { value: "Confidential", label: "Confidential" },
            ],
          },
          {
            id: "jurisdiction",
            label: "Legal jurisdiction",
            type: "text",
            slot: "context",
            placeholder: "e.g. United Kingdom",
            help: "Compliance is checked against this jurisdiction.",
            max: 120,
            clarifyPrompt: "Which country or region's employment law applies here?",
          },
        ],
      },
      {
        id: "compliance",
        title: "Compliance & approvals",
        fields: [
          {
            id: "complianceConstraints",
            label: "DEI / legal constraints",
            type: "chips",
            slot: "constraint",
            placeholder: "Add a constraint and press Enter",
            clarifyPrompt: "Any specific legal or DEI constraints this must respect?",
          },
          {
            id: "approvalChain",
            label: "Approval chain",
            type: "text",
            slot: "context",
            placeholder: "e.g. People lead → Legal → CEO",
            max: 200,
          },
          {
            id: "referenceExample",
            label: "Reference example",
            type: "textarea",
            slot: "example",
            placeholder: "Optional: paste an existing document whose style to imitate.",
            max: 1500,
          },
        ],
      },
    ],
  },
  compliance: [
    {
      code: "HR-001",
      label: "Legally compliant",
      description:
        "Stay within employment law for the stated jurisdiction; flag anything that needs legal review.",
    },
    {
      code: "HR-002",
      label: "Non-discriminatory",
      description:
        "Use inclusive, non-discriminatory language; no bias against any protected class.",
    },
    {
      code: "HR-003",
      label: "Respect confidentiality",
      description:
        "Honour the stated confidentiality level; never expose private employee data.",
    },
    {
      code: "HR-004",
      label: "Not legal advice",
      description:
        "Do not present the output as formal legal advice; recommend review where appropriate.",
    },
  ],
};
