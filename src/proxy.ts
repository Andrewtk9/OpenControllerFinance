import { NextRequest, NextResponse } from "next/server";

// Proteção por senha quando o app é exposto na rede (APK/celular).
// Sem AUTH_PASSWORD definida, o app segue aberto — use apenas em 127.0.0.1.

async function sha256Hex(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function proxy(request: NextRequest) {
  const password = process.env.AUTH_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  // /api/sync tem autenticação própria via CRON_SECRET
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const expected = await sha256Hex(password);
  const cookie = request.cookies.get("ocf_auth")?.value;
  if (cookie === expected) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
