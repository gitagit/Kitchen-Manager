import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function enrichWithCategory(workspaceId: string, groceryItems: { name: string }[]) {
  const invItems = await prisma.item.findMany({ where: { workspaceId }, select: { name: true, category: true } });
  const categoryMap = new Map(invItems.map(i => [normName(i.name), i.category]));
  return groceryItems.map(i => ({ ...i, category: categoryMap.get(normName(i.name)) ?? "OTHER" }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const items = await prisma.groceryItem.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  const enriched = await enrichWithCategory(workspaceId, items);
  return NextResponse.json({ items: enriched });
}

const schema = z.object({
  recipeIds: z.array(z.string()).optional(),
  includeStaplesBelowPar: z.boolean().optional().default(true)
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { recipeIds, includeStaplesBelowPar } = parsed.data;

  const items = await prisma.item.findMany({
    where: { workspaceId },
    include: { batches: true }
  });
  const inv = new Set(items.map((i) => normName(i.name)));

  const needed = new Map<string, { channel: string; reason: string }>();

  if (recipeIds?.length) {
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds }, workspaceId },
      include: { ingredients: true }
    });

    for (const r of recipes) {
      for (const ing of r.ingredients.filter((i) => i.required)) {
        const n = normName(ing.name);
        if (!inv.has(n)) {
          needed.set(n, { channel: "IN_PERSON", reason: `missing_for_recipe:${r.title}` });
        }
      }
    }
  }

  if (includeStaplesBelowPar) {
    // MVP: if staple and no batches, add. If parLevel set, we can't compute properly yet with freeform qty.
    for (const it of items) {
      if (it.staple && it.batches.length === 0) {
        needed.set(normName(it.name), { channel: "SHIP", reason: "staple_missing" });
      }
    }
  }

  const groceryData = Array.from(needed.entries()).map(([name, meta]) => ({
    workspaceId,
    name,
    channel: meta.channel,
    reason: meta.reason
  }));

  await prisma.$transaction([
    prisma.groceryItem.deleteMany({ where: { workspaceId } }),
    prisma.groceryItem.createMany({ data: groceryData })
  ]);

  const created = { count: groceryData.length };

  const all = await prisma.groceryItem.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  const enriched = await enrichWithCategory(workspaceId, all);
  return NextResponse.json({ created: created.count, items: enriched });
}
