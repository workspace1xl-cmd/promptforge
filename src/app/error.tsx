"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-line bg-white p-8 shadow-sm">
        <div className="eyebrow">Temporary service interruption</div>
        <h1 className="mt-3 text-2xl font-bold text-ink">PromptForge could not load its workspace.</h1>
        <p className="mt-3 text-sm leading-6 text-ink2">
          The database may be waking up or a deployment may still be finishing. Wait a moment,
          then try again. No brief or generated prompt was submitted from this page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
