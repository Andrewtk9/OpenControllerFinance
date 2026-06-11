"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const password = process.env.AUTH_PASSWORD;
  if (!password) redirect("/");

  const attempt = String(formData.get("password") ?? "");
  if (attempt !== password) redirect("/login?erro=1");

  const token = createHash("sha256").update(password).digest("hex");
  const cookieStore = await cookies();
  cookieStore.set("ocf_auth", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: "/",
  });
  redirect("/");
}
