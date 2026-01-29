import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { normName } from "@/lib/normalize";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true }
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  // Get all inventory items for matching
  const items = await prisma.item.findMany({
    include: { batches: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  // Create a map of normalized item names to their cost
  const itemCostMap = new Map<string, number>();
  for (const item of items) {
    const cost = item.batches[0]?.costCents ?? item.defaultCostCents;
    if (cost != null) {
      itemCostMap.set(normName(item.name), cost);
    }
  }

  // Calculate cost for each ingredient
  const ingredientCosts: { name: string; costCents: number | null; matched: boolean }[] = [];
  let totalCents = 0;
  let hasUnmatchedRequired = false;

  for (const ing of recipe.ingredients) {
    const normalizedName = normName(ing.name);
    const cost = itemCostMap.get(normalizedName) ?? null;

    ingredientCosts.push({
      name: ing.name,
      costCents: cost,
      matched: cost != null
    });

    if (cost != null) {
      totalCents += cost;
    } else if (ing.required) {
      hasUnmatchedRequired = true;
    }
  }

  return NextResponse.json({
    recipeId: id,
    title: recipe.title,
    servings: recipe.servings,
    ingredientCosts,
    totalCents,
    costPerServing: recipe.servings > 0 ? Math.round(totalCents / recipe.servings) : null,
    complete: !hasUnmatchedRequired,
    matchedCount: ingredientCosts.filter(i => i.matched).length,
    totalIngredients: ingredientCosts.length
  });
}
