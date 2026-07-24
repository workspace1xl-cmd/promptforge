// Word export via the `docx` package — pure JS, no native deps, handles
// pagination/wrapping itself so this is a thin mapping from our markdown
// lines onto its Paragraph/HeadingLevel API.

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { parseLines } from "./markdown-lines";
import type { ExportBundle } from "./types";

export async function buildDocx(bundle: ExportBundle): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: bundle.title, heading: HeadingLevel.TITLE }),
    ...bundle.subtitleLines.map(
      (sub) =>
        new Paragraph({
          children: [new TextRun({ text: sub, color: "6B7789", size: 20 })],
        }),
    ),
  ];

  for (const section of bundle.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 160 },
      }),
    );

    for (const block of parseLines(section.body)) {
      if (block.type === "blank") {
        children.push(new Paragraph({ text: "" }));
        continue;
      }
      if (block.type === "h1") {
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2 }));
        continue;
      }
      if (block.type === "h2") {
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3 }));
        continue;
      }
      if (block.type === "bullet") {
        children.push(new Paragraph({ text: block.text, bullet: { level: 0 } }));
        continue;
      }
      children.push(new Paragraph({ text: block.text, spacing: { after: 80 } }));
    }
  }

  const doc = new Document({
    title: bundle.title,
    creator: "PromptForge",
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}
