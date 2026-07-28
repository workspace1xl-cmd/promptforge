import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, accessDigest } from "@/lib/access";

export async function proxy(request: NextRequest) {
  const configured = process.env.PROMPTFORGE_ACCESS_CODE?.trim();
  if (!configured) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/access" || pathname === "/api/access") return NextResponse.next();

  const actual = request.cookies.get(ACCESS_COOKIE)?.value;
  const expected = await accessDigest(configured);
  if (actual === expected) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Access required." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/access", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
