import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normName } from "@/lib/normalize";

const schema = z.object({
  recipeIds: z.array(z.string()).optional(),
  includeStaplesBelowPar: z.boolean().optional().default(true)
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { recipeIds, includeStaplesBelowPar } = parsed.data;

  const items = await prisma.item.findMany({ include: { batches: true } });
  const inv = new Set(items.map((i) => normName(i.name)));

  const needed = new Map<string, { channel: string; reason: string }>();

  if (recipeIds?.length) {
    const recipes = await prisma.recipe.findMany({
      where: { id: { in: recipeIds } },
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

  // Clear old list for simplicity
  await prisma.groceryItem.deleteMany({});

  const created = await prisma.groceryItem.createMany({
    data: Array.from(needed.entries()).map(([name, meta]) => ({
      name,
      channel: meta.channel,
      reason: meta.reason
    }))
  });

  const all = await prisma.groceryItem.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ created: created.count, items: all });
}
