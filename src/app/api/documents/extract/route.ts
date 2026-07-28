import { extractText } from "unpdf";
import mammoth from "mammoth";
import { clientKey, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 40_000;

export async function POST(request: Request) {
  const limited = rateLimit(clientKey(request), 10, 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds!);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a document." }, { status: 400 });
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return Response.json({ error: "The file must be between 1 byte and 10 MB." }, { status: 413 });
  }

  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!["pdf", "docx", "txt", "md"].includes(ext)) {
    return Response.json({ error: "Supported formats: PDF, DOCX, TXT and MD." }, { status: 415 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = "";
    let pages: number | undefined;
    if (ext === "pdf") {
      const extracted = await extractText(bytes, { mergePages: true });
      text = extracted.text;
      pages = extracted.totalPages;
    } else if (ext === "docx") {
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    } else {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }

    text = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
    if (!text) {
      return Response.json({ error: "No readable text was found. Scanned PDFs need OCR before upload." }, { status: 422 });
    }
    return Response.json({
      filename: file.name,
      text: text.slice(0, MAX_TEXT_CHARS),
      characters: Math.min(text.length, MAX_TEXT_CHARS),
      pages,
      truncated: text.length > MAX_TEXT_CHARS,
    });
  } catch {
    return Response.json({ error: "This document could not be read. It may be encrypted or damaged." }, { status: 422 });
  }
}
