"use client";

import * as React from "react";
import { Button, Input, Spinner } from "@/components/ui";

export default function AccessPage() {
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function unlock(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Could not unlock PromptForge.");
        return;
      }
      window.location.assign("/");
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[75vh] max-w-md place-items-center px-6 py-12">
      <section className="w-full rounded-2xl border border-line bg-surface p-7 shadow-sm">
        <div className="eyebrow">Protected workspace</div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Enter your access code</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink2">
          PromptForge uses a private Claude API key, so generation is limited to approved teammates.
        </p>
        <form className="mt-6 flex flex-col gap-3" onSubmit={unlock}>
          <label className="text-[13px] font-semibold text-ink" htmlFor="access-code">Access code</label>
          <Input id="access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="current-password" required autoFocus />
          {error && <p className="text-xs text-danger" role="alert">{error}</p>}
          <Button variant="forge" type="submit" disabled={busy || !code}>
            {busy ? <Spinner /> : null}{busy ? "Unlocking…" : "Open PromptForge"}
          </Button>
        </form>
      </section>
    </main>
  );
}
