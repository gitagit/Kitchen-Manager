import { NextResponse } from "next/server";
import { z } from "zod";

const COOKIE_NAME = "km-auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const LoginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const secret = process.env.SITE_SECRET;
  if (!secret) {
    // No secret configured — auth is disabled (local dev)
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.password !== secret) {
    // Uniform response time to prevent timing attacks
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  return res;
}
