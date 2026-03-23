import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/mobile-auth";

const WasteReasons = ["EXPIRED", "SPOILED", "UNUSED", "LEFTOVER", "OTHER"] as const;

const createSchema = z.object({
  itemName: z.string().min(1).max(200),
  category: z.string().min(1),
  quantityText: z.string().min(1).max(100),
  reason: z.enum(WasteReasons),
  costCents: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(500).optional(),
  discardedOn: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

  const where: Record<string, unknown> = { workspaceId };
  if (from || to) {
    where.discardedOn = {};
    if (from) (where.discardedOn as Record<string, Date>).gte = new Date(from);
    if (to) (where.discardedOn as Record<string, Date>).lte = new Date(to);
  }

  const logs = await prisma.wasteLog.findMany({
    where,
    orderBy: { discardedOn: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const log = await prisma.wasteLog.create({
    data: {
      workspaceId,
      itemName: data.itemName,
      category: data.category,
      quantityText: data.quantityText,
      reason: data.reason,
      costCents: data.costCents ?? null,
      notes: data.notes ?? null,
      discardedOn: data.discardedOn ? new Date(data.discardedOn) : new Date(),
    },
  });

  return NextResponse.json({ log });
}

export async function DELETE(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const log = await prisma.wasteLog.findUnique({ where: { id } });
  if (!log || log.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.wasteLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
