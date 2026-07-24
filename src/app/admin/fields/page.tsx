import { FieldOverridesAdmin } from "@/components/FieldOverridesAdmin";

export const metadata = { title: "Field overrides — PromptForge" };

export default function FieldOverridesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="eyebrow">Admin · edit without a code deploy</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Field overrides</h1>
      <p className="mt-1 mb-8 text-[13.5px] text-ink2">
        Make a field required or optional org-wide, or lock it to a fixed value so it never
        appears in the wizard but still shapes every generated prompt for that department.
      </p>
      <FieldOverridesAdmin />
    </main>
  );
}
