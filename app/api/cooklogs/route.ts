import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  recipeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
  wouldRepeat: z.boolean().optional(),
  servedTo: z.number().int().positive().optional(),
  cookedOn: z.string().datetime().optional()
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const recipeId = searchParams.get("recipeId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Record<string, unknown> = {
    recipe: { workspaceId }
  };
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  // Verify recipe belongs to this workspace before creating log
  const recipe = await prisma.recipe.findUnique({ where: { id: data.recipeId } });
  if (!recipe || recipe.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

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
