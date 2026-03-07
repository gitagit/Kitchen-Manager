import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Simple in-memory rate limit: max 5 registrations per IP per hour.
// Per-instance only (serverless caveat), but still blocks naive burst attacks.
const registerAttempts = new Map<string, number[]>();
function checkRegisterRateLimit(ip: string): boolean {
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const max = 5;
  const timestamps = (registerAttempts.get(ip) ?? []).filter(t => now - t < window);
  if (timestamps.length >= max) return false;
  registerAttempts.set(ip, [...timestamps, now]);
  return true;
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRegisterRateLimit(ip)) {
    return NextResponse.json({ error: "Too many registration attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name: name ?? null },
  });

  return NextResponse.json({ ok: true });
}
