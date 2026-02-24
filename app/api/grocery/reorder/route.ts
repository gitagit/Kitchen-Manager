import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function inferChannel(category: string, location?: string | null): "SHIP" | "IN_PERSON" | "EITHER" {
  if (location === "FRIDGE" || location === "FREEZER") return "IN_PERSON";
  if (["PRODUCE", "MEAT", "DAIRY"].includes(category)) return "IN_PERSON";
  if (category === "FROZEN") return "EITHER";
  return "SHIP";
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

  // Build inventory set scoped to workspace
  const allItems = await prisma.item.findMany({
    where: { workspaceId },
    include: { batches: true }
  });
  const inv = new Set(allItems.map(i => normName(i.name)));

  // Candidates map: normName -> { name, channel, reason, priority }
  const candidates = new Map<string, { name: string; channel: string; reason: string; priority: number }>();

  // Signal 1: Meal plan (next 7 days), priority 1
  const plans = await prisma.mealPlan.findMany({
    where: { workspaceId, date: { gte: now, lte: sevenDaysOut }, recipeId: { not: null } }
  });
  const plannedRecipeIds = [...new Set(plans.map(p => p.recipeId!).filter(Boolean))];

  if (plannedRecipeIds.length > 0) {
    const plannedRecipes = await prisma.recipe.findMany({
      where: { id: { in: plannedRecipeIds }, workspaceId },
      include: { ingredients: true }
    });
    for (const recipe of plannedRecipes) {
      for (const ing of recipe.ingredients.filter(i => i.required)) {
        const n = normName(ing.name);
        if (!inv.has(n) && !candidates.has(n)) {
          candidates.set(n, {
            name: ing.name,
            channel: "EITHER",
            reason: `planned: ${recipe.title}`,
            priority: 1,
          });
        } else if (candidates.has(n)) {
          // Append recipe name to existing reason if from a different recipe
          const existing = candidates.get(n)!;
          if (!existing.reason.includes(recipe.title)) {
            existing.reason += ` · ${recipe.title}`;
          }
        }
      }
    }
  }

  // Signal 2: Cook frequency (last 8 weeks, ≥2 cooks), priority 2
  const recentLogs = await prisma.cookLog.findMany({
    where: {
      cookedOn: { gte: eightWeeksAgo },
      recipe: { workspaceId }
    },
    include: { recipe: { include: { ingredients: true } } }
  });

  const cookCounts: Record<string, number> = {};
  for (const log of recentLogs) {
    cookCounts[log.recipeId] = (cookCounts[log.recipeId] || 0) + 1;
  }

  const frequentRecipeIds = Object.entries(cookCounts)
    .filter(([, count]) => count >= 2)
    .map(([id]) => id);

  const frequentRecipes = [...new Set(recentLogs
    .filter(l => frequentRecipeIds.includes(l.recipeId))
    .map(l => l.recipe)
  )];

  for (const recipe of frequentRecipes) {
    for (const ing of recipe.ingredients.filter(i => i.required)) {
      const n = normName(ing.name);
      if (!inv.has(n) && !candidates.has(n)) {
        candidates.set(n, {
          name: ing.name,
          channel: "EITHER",
          reason: "frequently cooked",
          priority: 2,
        });
      }
    }
  }

  // Signal 3: Par level violations, priority 1
  const belowPar = allItems.filter(i => i.parLevel != null && i.batches.length < i.parLevel!);
  for (const item of belowPar) {
    const n = normName(item.name);
    if (!candidates.has(n)) {
      candidates.set(n, {
        name: item.name,
        channel: inferChannel(item.category, item.location),
        reason: "below par level",
        priority: 1,
      });
    } else {
      // Upgrade reason to mention par level too
      const existing = candidates.get(n)!;
      if (!existing.reason.includes("below par")) {
        existing.reason += " · below par level";
        existing.priority = 1; // escalate priority
      }
    }
  }

  // Apply channel from inventory item records where available (more accurate than inference)
  for (const [n, candidate] of candidates.entries()) {
    if (candidate.channel === "EITHER") {
      const invItem = allItems.find(i => normName(i.name) === n);
      if (invItem) {
        candidate.channel = inferChannel(invItem.category, invItem.location);
      }
    }
  }

  // Dedup against existing grocery list scoped to workspace
  const existingGrocery = await prisma.groceryItem.findMany({ where: { workspaceId } });
  const existingNames = new Set(existingGrocery.map(i => normName(i.name)));

  const toInsert = Array.from(candidates.values())
    .filter(c => !existingNames.has(normName(c.name)))
    .map(c => ({ ...c, workspaceId }));

  if (toInsert.length > 0) {
    await prisma.groceryItem.createMany({ data: toInsert });
  }

  const all = await prisma.groceryItem.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ added: toInsert.length, items: all });
}
