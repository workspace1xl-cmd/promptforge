"use client";

import * as React from "react";
import { Button, Spinner } from "@/components/ui";

export function DocumentUpload({ onExtract }: { onExtract: (text: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage(`Reading ${file.name}…`);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data?.error ?? "The document could not be read.");
        return;
      }
      onExtract(data.text);
      setMessage(`${data.filename} imported${data.pages ? ` · ${data.pages} pages` : ""}${data.truncated ? " · shortened to fit" : ""}`);
    } catch {
      setMessage("Upload failed. Please paste the brief instead.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line2 bg-surface2 p-3">
      <input ref={inputRef} className="sr-only" type="file" accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={(event) => upload(event.target.files?.[0])} />
      <Button size="sm" type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
        {busy ? <Spinner /> : null}{busy ? "Reading document…" : "Upload SOP / client brief"}
      </Button>
      <span className="text-xs text-ink3">PDF, DOCX, TXT or MD · up to 10 MB</span>
      {message && <span className="w-full text-xs text-ink2" role="status">{message}</span>}
    </div>
  );
}
