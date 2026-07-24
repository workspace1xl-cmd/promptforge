import { ComplianceAdmin } from "@/components/ComplianceAdmin";

export const metadata = { title: "Compliance rules — PromptForge" };

export default function CompliancePage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="eyebrow">Admin · edit without a code deploy</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Compliance rules</h1>
      <p className="mt-1 mb-8 text-[13.5px] text-ink2">
        Hard rules are injected into every generated prompt as non-negotiable constraints.
        Edit, add, or retire them per department.
      </p>
      <ComplianceAdmin />
    </main>
  );
}
