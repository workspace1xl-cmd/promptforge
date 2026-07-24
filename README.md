# PromptForge

**A department-aware AI prompt & SOP generation platform.** A team picks a department,
answers a short guided form, and PromptForge assembles a world-class, production-ready AI
prompt — plus an optional SOP / briefing — grounded in real prompt-engineering
methodology rather than guesswork.

> Department + use case → dynamic form (with branching logic) → meta-prompt engine →
> a ready-to-paste prompt, an SOP / briefing, or a coding-agent hand-off. Regenerate,
> refine, save as a template.

The core bet: a guided, conditional form **is** the prompt-engineering process. It forces
the task / context / format / constraints that the [Google Prompt Engineering whitepaper]
stresses, and assembles the reusable [Vanderbilt prompt patterns] instead of leaving users
to freehand a blank chat box.

---

## Status — Phases 0 & 1 (complete)

**Phase 0** — the pipeline, proven end-to-end on one department:

- Config-driven **dynamic multi-step wizard** with conditional/branching fields
  (e.g. turning on “needs a back end” reveals the database & hosting fields).
- **Live meta-prompt preview** that assembles as you type, with a seven-part framework
  legend (Role · Task · Context · Constraints · Format · Examples · Technique).
- **Automatic technique selection** (zero-shot / few-shot / chain-of-thought / ReAct).
- Per-department **compliance rules** injected as hard constraints in every prompt.
- Three artifacts from one brief: **AI prompt**, **SOP / briefing**, and a
  **“how it was built”** transparency view.
- **History & versioning**, **save as template**, regenerate with verbosity/rigour and
  free-text refinement. Light/dark, keyboard-accessible, responsive.

**Phase 1** — scaled out, and it validated the core abstraction:

- **Six departments**, all driven by config with **zero new UI or engine code**:
  Software Development, QA / Testing, Content / Copywriting, Graphics / Design, HR,
  Marketing. Each is one `DepartmentConfig` object with its own wizard, branching,
  persona, patterns, output formats and compliance rules.
- Output-format instructions and technique preferences are now **config-driven**, so a new
  department shapes its own prompts without touching the engine.
- **Compliance-rules admin** (`/admin/compliance`) — add, edit, retire or toggle rules per
  department without a code deploy.
- **Templates library** (`/templates`) — save a filled-in brief and load it back into the
  wizard pre-filled (`/generate/<dept>?template=<id>`).

**Phase 2** — the quality & intelligence layer:

- **Quality critique pass** — every generation is scored 0–100 against the Google whitepaper
  checklist (role, task, context, format, constraints, technique, simplicity, plus an
  examples bonus). Score and per-criterion notes are shown in the result view and stored on
  `GeneratedPrompt.qualityScore`.
- **Auto-repair** — weak required checks get fixed before the artifact reaches the user. With
  no AI key, a mechanical, non-inventive note is appended for genuine gaps (e.g. missing
  context). With `CEREBRAS_API_KEY` set, a second Cerebras call re-verifies the checklist
  against the actual prompt text and rewrites the weak sections without inventing new facts.
- **Clarify before generating** (Flipped Interaction pattern) — if a brief is thin (few
  optional fields filled), PromptForge asks up to three targeted follow-up questions before
  forging, instead of silently guessing. Answers feed straight into the prompt's context.
  Each department config marks a few fields `clarifyPrompt`-worthy.
- **A/B variants** — a toggle on the Output step forges two genuinely different takes on one
  brief (a different technique *and* rigour each, e.g. `zero-shot` vs `chain-of-thought`),
  versioned against the same submission, so there's a real choice to make.

**Phase 3** — polish, integrations, analytics:

- **Hand-off connectors** — send a generated artifact straight to **GitHub** (opens an
  issue) or **Jira** (opens a ticket), both optional and env-gated (`GITHUB_TOKEN`/
  `GITHUB_REPO`, `JIRA_BASE_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN`/`JIRA_PROJECT_KEY`). With
  neither configured, the UI clearly shows "not configured" and every attempt — success,
  failure, or not-configured — is written to `HandoffLog` for a real audit trail.
- **Org analytics** (`/analytics`) — submissions, generations, reuse rate, saved templates,
  generations and average quality score per department, provider/technique mix, a 14-day
  activity chart, and hand-off attempt counts. Server-rendered straight from Prisma
  aggregates.
- **Field overrides** (`/admin/fields`) — the closest fit to "fine-grained roles" that's
  honest about this app having no auth yet (see Known limitations below): an org admin can
  make any field required/optional, or **lock** it to a fixed value so it never appears in
  the wizard but still shapes every generated prompt for that department — enforced
  server-side (`enforceLockedAnswers`), not just hidden client-side.
- **Export to PDF / Word** — the prompt + SOP bundle as a formatted, paginated document
  (`pdf-lib` for PDF with hand-rolled text layout, `docx` for Word), generated in memory with
  no filesystem writes.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** with a token-based, theme-aware design system
- **Prisma 7** + **PostgreSQL** (via the `@prisma/adapter-pg` driver adapter)
- **zod** for request validation
- **AI engine:** Cerebras `gpt-oss-120b` via its OpenAI-compatible API, with a
  deterministic built-in engine as a no-key fallback

### Deviations from the original spec (deliberate)

- **Hand-rolled shadcn-style UI primitives** instead of the shadcn CLI — keeps the build
  hermetic on the bleeding-edge Next 16 / React 19 setup.
- **Controlled, config-driven form state + zod** instead of react-hook-form — RHF’s
  `register` API fights fully-dynamic `showIf` fields; zod still covers validation on both
  the client and the server.
- **No auth** in Phase 0 (single seeded organisation), per project decision. The data model
  keeps `Organization`/`User` so multi-tenant auth drops in later without a rewrite.

---

## The config-driven architecture (the important bit)

**A department is data, not code.** Each department is a `DepartmentConfig` object
(`src/lib/departments/`) describing its wizard steps, fields, branching, persona, patterns
and compliance rules. The seed writes it into the `FormTemplate.schema` JSON column, and a
single generic renderer builds the whole wizard from it. Adding QA/Testing, Content, etc.
in Phase 1 means adding one config object and re-seeding — **no new React components**.

The engine (`src/lib/engine/`) is isomorphic: the same `assemble.ts` powers the live
browser preview and the server-side generation. `provider.ts` (server-only) calls Cerebras
when a key is present, and otherwise renders the artifact deterministically.

```
src/
├── app/
│   ├── page.tsx                 # department picker
│   ├── generate/[dept]/page.tsx # loads config + overrides from DB → <Wizard/> (?template= prefills)
│   ├── history/page.tsx         # saved generations (versioned)
│   ├── templates/page.tsx       # templates library
│   ├── analytics/page.tsx       # org-wide usage dashboard
│   ├── admin/compliance/page.tsx# per-department rule editor
│   ├── admin/fields/page.tsx    # per-department field require/lock editor
│   └── api/{generate,generate/variants,clarify,templates,compliance,
│            field-overrides,handoff,handoff/status,export/[id]}/route.ts
├── components/                  # ui primitives, inputs, wizard, result view, admin
│   └── wizard/                  # FieldRenderer, LivePreview, ClarifyPanel, VariantPicker,
│                                 # HandoffPanel, ResultView
└── lib/
    ├── departments/             # config types + six department configs + registry + overrides.ts
    ├── engine/                  # patterns, assemble (isomorphic), critique (quality/repair),
    │                             # clarify (Flipped Interaction), provider (Cerebras + local)
    ├── integrations/            # github.ts, jira.ts (optional, env-gated), format.ts
    ├── export/                  # pdf.ts, docx.ts, markdown-lines.ts (shared parser), types.ts
    ├── server/runGeneration.ts  # shared persist+critique helper for single & A/B generation
    ├── analytics-window.ts      # all Date.now()/new Date() impurity lives here, not in components
    ├── validation.ts            # zod request schemas + required-field checks
    └── db.ts                    # Prisma client (pg adapter)
prisma/schema.prisma             # 11 models: the original 9 + FieldOverride + HandoffLog
prisma/seed.ts                   # org, prompt patterns, department configs, compliance rules
```

---

## Running locally

Requires Node 20.9+ and a PostgreSQL database.

```bash
# 1. Install (postinstall runs `prisma generate`)
npm install

# 2. Configure the environment
cp .env.example .env
#    → set DATABASE_URL to your Postgres connection string
#    → (optional) set CEREBRAS_API_KEY to use gpt-oss-120b; blank uses the local engine
#    → (optional) set GITHUB_TOKEN/GITHUB_REPO and/or JIRA_* to enable hand-off connectors;
#      blank means the UI shows "not configured" and falls back to copy

# 3. Create the schema and seed the Software Development department
npm run db:push
npm run db:seed

# 4. Run
npm run dev        # http://localhost:3000
```

Useful scripts: `npm run build`, `npm run db:reset` (force-reset + reseed).

---

## Deploying (free tier)

- **Database:** a free **Neon** or **Supabase** Postgres — put its connection string in
  `DATABASE_URL`.
- **App:** deploy to **Vercel**. Set `DATABASE_URL` (and optionally `CEREBRAS_API_KEY`,
  `CEREBRAS_BASE_URL`, `CEREBRAS_MODEL`) as environment variables. `prisma generate` runs on
  install; run `npm run db:push && npm run db:seed` once against the hosted database.

## The AI engine

If `CEREBRAS_API_KEY` is set, the engine builds a system meta-prompt ("you are an expert
prompt engineer…") plus a structured-input payload and sends them to `gpt-oss-120b` via the
OpenAI-compatible chat-completions endpoint. With no key, the deterministic local engine
assembles the same structured artifact. Either way the interface — and the saved output — is
identical, so you can start without a key and switch on the model later.

## Known limitations (read before a real deploy)

- **No authentication.** A single seeded organisation, no login — a deliberate Phase 0
  scope decision, not an oversight. Every route, including both admin screens
  (`/admin/compliance`, `/admin/fields`) and the hand-off/export endpoints, is reachable by
  anyone who can reach the deployment. Fine for an internal/trusted deployment; **do not**
  put real `GITHUB_TOKEN`/`JIRA_API_TOKEN` credentials on a publicly-reachable instance
  without adding auth first — an unauthenticated caller could otherwise spam issue/ticket
  creation using the operator's credentials.
- **No rate limiting** anywhere, including the Cerebras calls and the two hand-off
  connectors. Same recommendation as above: add rate limiting (e.g. a per-IP limiter backed
  by Upstash Redis) before enabling real connector credentials in a public deployment.
- `npm audit` reports 7 pre-existing high/moderate findings (in `next`, `prisma`, `postcss`,
  `sharp`, `find-my-way`, `valibot`) — none from `pdf-lib`/`docx`. All are in code paths this
  app doesn't exercise (Next's Image Optimization / `sharp` — no `next/image` used anywhere;
  Prisma's local `prisma dev` server — this project uses its own Postgres instead) or are
  build-time-only (`postcss`). Fixing them means downgrading `next`/`prisma` by a major
  version, which isn't warranted given the actual exposure. Re-check on the next `next`/
  `prisma` release.
- Locked fields' full config metadata (label, help text) still travels to the client in the
  React hydration payload even though the field never renders — not a security issue
  (nothing secret; the same value ends up in the generated prompt anyway) but worth trimming
  server-side before passing config to `<Wizard>` if payload size ever matters.

[Google Prompt Engineering whitepaper]: https://www.kaggle.com/whitepaper-prompt-engineering
[Vanderbilt prompt patterns]: https://www.coursera.org/specializations/prompt-engineering
