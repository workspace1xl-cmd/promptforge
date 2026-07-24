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

## Status — Phase 0 (complete)

Phase 0 delivers one department (**Software Development**) working end-to-end, so the whole
pipeline is validated before scaling:

- Config-driven **dynamic multi-step wizard** with conditional/branching fields
  (e.g. turning on “needs a back end” reveals the database & hosting fields).
- **Live meta-prompt preview** that assembles as you type, with a seven-part framework
  legend (Role · Task · Context · Constraints · Format · Examples · Technique).
- **Automatic technique selection** (zero-shot / few-shot / chain-of-thought / ReAct) from
  signals in the form.
- Per-department **compliance rules** injected as hard constraints in every prompt.
- Three artifacts from one brief: **AI prompt**, **SOP / briefing**, and a
  **“how it was built”** transparency view.
- **History & versioning** — every generation is saved and re-viewable.
- **Save as template**, regenerate with verbosity/rigour controls and free-text refinement.
- Light/dark themes, keyboard-accessible, responsive.

Later phases (not built yet): multi-department expansion (QA, Content, Design, HR,
Marketing) as **config only**, a compliance-rules admin screen, a prompt-quality critique
pass, clarify-before-generating, and integrations/analytics.

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
│   ├── generate/[dept]/page.tsx # loads config from DB → <Wizard/>
│   ├── history/page.tsx         # saved generations
│   └── api/{generate,templates}/route.ts
├── components/                  # ui primitives, inputs, wizard, result view
└── lib/
    ├── departments/             # config types + Software Development config + registry
    ├── engine/                  # patterns, assemble (isomorphic), provider (Cerebras + local)
    ├── validation.ts            # zod request schema + required-field checks
    └── db.ts                    # Prisma client (pg adapter)
prisma/schema.prisma             # 9 models per the spec
prisma/seed.ts                   # org, prompt patterns, department config, compliance rules
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

[Google Prompt Engineering whitepaper]: https://www.kaggle.com/whitepaper-prompt-engineering
[Vanderbilt prompt patterns]: https://www.coursera.org/specializations/prompt-engineering
