// A4, hand-laid-out PDF via pdf-lib — no native deps, safe on serverless.
// Text is wrapped and paginated manually since pdf-lib doesn't do either.

import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { parseLines } from "./markdown-lines";
import type { ExportBundle } from "./types";

const PAGE_W = 595.28; // A4 in points
const PAGE_H = 841.89;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 28;

const INK = rgb(0.07, 0.09, 0.14);
const MUTED = rgb(0.45, 0.5, 0.58);
const ACCENT = rgb(0.31, 0.27, 0.9);

// pdf-lib's standard fonts (Helvetica) use WinAnsi (cp1252) encoding, not
// full Unicode. Section body text comes from free-text form answers as well
// as our own copy, so it can contain anything — this must never crash the
// export regardless of what a user typed.
const ARROW_MAP: Record<string, string> = { "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "⇐": "<=" };
const WINANSI_EXTRAS = new Set([
  0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039,
  0x203a, 0x2013, 0x2014, 0x20ac, 0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192,
  0x02c6, 0x02dc,
]);

function winAnsiSafe(text: string): string {
  // Decompose accented Latin letters and drop the combining marks first, so
  // extended-Latin scripts (Vietnamese, Turkish, etc.) fall back to a
  // readable base letter instead of "?" — most such letters aren't in
  // WinAnsi even though their unaccented form is.
  let out = text.normalize("NFD").replace(/[̀-ͯ]/g, "");
  out = out.replace(/[→←↔⇒⇐]/g, (ch) => ARROW_MAP[ch] ?? "?");
  return Array.from(out)
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (code === 0x09 || code === 0x0a || code === 0x0d) return ch;
      if (code >= 0x20 && code <= 0x7e) return ch;
      if (code >= 0xa0 && code <= 0xff) return ch; // Latin-1 supplement
      if (WINANSI_EXTRAS.has(code)) return ch;
      return "?"; // no sensible WinAnsi fallback (CJK, emoji, etc.)
    })
    .join("");
}

function sanitizeBundle(bundle: ExportBundle): ExportBundle {
  return {
    title: winAnsiSafe(bundle.title),
    subtitleLines: bundle.subtitleLines.map(winAnsiSafe),
    sections: bundle.sections.map((s) => ({
      heading: winAnsiSafe(s.heading),
      body: winAnsiSafe(s.body),
    })),
  };
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (line && font.widthOfTextAtSize(test, size) > width) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildPdf(rawBundle: ExportBundle): Promise<Uint8Array> {
  const bundle = sanitizeBundle(rawBundle);
  const pdf = await PDFDocument.create();
  pdf.setTitle(bundle.title);
  pdf.setProducer("PromptForge");
  pdf.setCreator("PromptForge");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const line = (
    text: string,
    size: number,
    font: PDFFont,
    color = INK,
    x = MARGIN,
    width = CONTENT_W,
    gap = 4,
  ) => {
    for (const l of wrap(font, text, size, width)) {
      ensure(size + gap);
      page.drawText(l, { x, y, size, font, color });
      y -= size + gap;
    }
  };

  // Title block
  line(bundle.title, 19, bold, INK, MARGIN, CONTENT_W, 6);
  for (const sub of bundle.subtitleLines) line(sub, 9.5, regular, MUTED, MARGIN, CONTENT_W, 3);
  y -= 12;
  ensure(1);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_W - MARGIN, y },
    thickness: 0.75,
    color: rgb(0.85, 0.87, 0.92),
  });
  y -= 18;

  for (const section of bundle.sections) {
    ensure(26);
    line(section.heading, 14.5, bold, ACCENT, MARGIN, CONTENT_W, 8);

    for (const block of parseLines(section.body)) {
      if (block.type === "blank") {
        y -= 6;
        continue;
      }
      if (block.type === "h1") {
        line(block.text, 12.5, bold, INK, MARGIN, CONTENT_W, 6);
        continue;
      }
      if (block.type === "h2") {
        line(block.text, 11, bold, INK, MARGIN, CONTENT_W, 5);
        continue;
      }
      if (block.type === "bullet") {
        const wrapped = wrap(regular, block.text, 10.5, CONTENT_W - 14);
        wrapped.forEach((l, i) => {
          ensure(10.5 + 3);
          if (i === 0) page.drawText("•", { x: MARGIN, y, size: 10.5, font: regular, color: INK });
          page.drawText(l, { x: MARGIN + 14, y, size: 10.5, font: regular, color: INK });
          y -= 10.5 + 3;
        });
        continue;
      }
      line(block.text, 10.5, regular, INK, MARGIN, CONTENT_W, 3);
    }
    y -= 14;
  }

  // Footer: page numbers + attribution, drawn once all pages exist.
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawText(`PromptForge · Page ${i + 1} of ${pages.length}`, {
      x: MARGIN,
      y: FOOTER_Y,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  return pdf.save();
}
