import { cookies } from "next/headers";
import { ACCESS_COOKIE, accessDigest } from "@/lib/access";
import { clientKey, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`access:${clientKey(request)}`, 8, 15 * 60_000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSeconds!);

  const configured = process.env.PROMPTFORGE_ACCESS_CODE?.trim();
  if (!configured) return Response.json({ ok: true });

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code : "";
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!code || (await accessDigest(code)) !== (await accessDigest(configured))) {
    return Response.json({ error: "That access code is not valid." }, { status: 401 });
  }

  (await cookies()).set(ACCESS_COOKIE, await accessDigest(configured), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}
