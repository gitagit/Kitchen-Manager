import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/mobile-auth";

const schema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]).optional(),
});

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });

  const { token, platform } = parsed.data;

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: auth.userId, platform: platform ?? null },
    create: {
      token,
      userId: auth.userId,
      workspaceId: auth.workspaceId,
      platform: platform ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
