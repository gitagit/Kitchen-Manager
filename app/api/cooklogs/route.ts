import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  recipeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
  wouldRepeat: z.boolean().optional(),
  servedTo: z.number().int().positive().optional(),
  cookedOn: z.string().datetime().optional()
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get("recipeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (recipeId) where.recipeId = recipeId;
  if (from || to) {
    where.cookedOn = {};
    if (from) (where.cookedOn as Record<string, Date>).gte = new Date(from);
    if (to) (where.cookedOn as Record<string, Date>).lte = new Date(to);
  }

  const logs = await prisma.cookLog.findMany({
    where,
    include: {
      recipe: {
        select: { id: true, title: true, cuisine: true }
      }
    },
    orderBy: { cookedOn: "desc" }
  });

  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  const log = await prisma.cookLog.create({
    data: {
      recipeId: data.recipeId,
      rating: data.rating,
      notes: data.notes ?? null,
      wouldRepeat: data.wouldRepeat ?? true,
      servedTo: data.servedTo ?? null,
      cookedOn: data.cookedOn ? new Date(data.cookedOn) : new Date()
    }
  });

  return NextResponse.json({ log });
}
