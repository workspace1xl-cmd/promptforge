"use client";

import type { AnswerValue, FieldDef } from "@/lib/departments/types";
import { Input, InfoTip, Label, Segmented, Textarea, Toggle } from "@/components/ui";
import { Chips, MultiSelect } from "@/components/inputs";
import { DocumentUpload } from "./DocumentUpload";

export function FieldRenderer({
  field,
  value,
  onChange,
  invalid,
}: {
  field: FieldDef;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  invalid?: boolean;
}) {
  const asArray = Array.isArray(value) ? (value as string[]) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={`f-${field.id}`}>
          {field.label}
          {field.required && <span className="text-danger">*</span>}
        </Label>
        {field.help && <InfoTip text={field.help} />}
      </div>

      {field.type === "text" && (
        <Input
          id={`f-${field.id}`}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          maxLength={field.max ?? 200}
          onChange={(e) => onChange(e.target.value)}
          className={invalid ? "border-danger" : ""}
        />
      )}

      {field.type === "number" && (
        <Input
          id={`f-${field.id}`}
          type="number"
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={invalid ? "border-danger" : ""}
        />
      )}

      {field.type === "textarea" && (
        <>
          {field.id === "sourceBrief" && <DocumentUpload onExtract={onChange} />}
          <Textarea
            id={`f-${field.id}`}
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            maxLength={field.max ?? 2000}
            onChange={(e) => onChange(e.target.value)}
            className={invalid ? "border-danger" : ""}
          />
          {field.id === "sourceBrief" && (
            <span className="text-right text-[11px] text-ink3">
              {String(value ?? "").length.toLocaleString()} / {(field.max ?? 2000).toLocaleString()} characters
            </span>
          )}
        </>
      )}

      {field.type === "select" && (
        <div className="relative">
          <select
            id={`f-${field.id}`}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={`w-full appearance-none rounded-lg border bg-surface2 px-3 py-2 pr-9 text-sm text-ink focus:outline-none focus:border-accent focus:bg-surface ${invalid ? "border-danger" : "border-line2"}`}
          >
            <option value="">Select…</option>
            {field.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink3">
            ▾
          </span>
        </div>
      )}

      {field.type === "segment" && (
        <Segmented
          options={field.options ?? []}
          value={value as string | undefined}
          onChange={onChange}
        />
      )}

      {field.type === "toggle" && (
        <Toggle checked={value === true} onChange={(v) => onChange(v)} />
      )}

      {field.type === "multiselect" && (
        <MultiSelect
          options={field.options ?? []}
          value={asArray}
          onChange={(v) => onChange(v)}
          allowOther={field.allowOther}
        />
      )}

      {field.type === "chips" && (
        <Chips value={asArray} onChange={(v) => onChange(v)} placeholder={field.placeholder} />
      )}

      {invalid && <span className="text-xs text-danger">{field.label} is required.</span>}
    </div>
  );
}
