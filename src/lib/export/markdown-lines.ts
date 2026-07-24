// A tiny, shared parser for the lightweight markdown our generated prompts
// use (# headings, bullet lines). Both the PDF and Word renderers consume
// this so the two exports stay visually consistent.

export type LineBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "bullet"; text: string }
  | { type: "p"; text: string }
  | { type: "blank" };

export function parseLines(source: string): LineBlock[] {
  return source.split("\n").map((raw): LineBlock => {
    const line = raw.trimEnd();
    if (line.trim() === "") return { type: "blank" };
    if (line.startsWith("## ")) return { type: "h2", text: line.slice(3) };
    if (line.startsWith("# ")) return { type: "h1", text: line.slice(2) };
    if (line.startsWith("- ")) return { type: "bullet", text: line.slice(2) };
    return { type: "p", text: line };
  });
}
