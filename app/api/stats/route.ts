import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  // Run all independent queries in parallel
  const [cookLogs, techniques, totalRecipes, allItems, prefsRow] = await Promise.all([
    prisma.cookLog.findMany({
      where: { recipe: { workspaceId } },
      include: {
        recipe: {
          select: {
            id: true,
            title: true,
            cuisine: true,
            difficulty: true,
            servings: true,
            ingredients: { select: { name: true } }
          }
        }
      },
      orderBy: { cookedOn: "asc" }
    }),
    prisma.technique.findMany({
      where: { workspaceId },
      include: {
        recipes: {
          include: {
            recipe: { include: { cookLogs: { select: { id: true } } } }
          }
        }
      }
    }),
    prisma.recipe.count({ where: { workspaceId } }),
    prisma.item.findMany({
      where: { workspaceId },
      include: { batches: { orderBy: { createdAt: "desc" }, take: 1 } }
    }),
    prisma.userPreferences.findUnique({
      where: { workspaceId },
      select: { showGamification: true }
    })
  ]);

  // Build cost map once
  const itemCostMap = new Map<string, number>();
  for (const item of allItems) {
    const cost = item.batches[0]?.costCents ?? (item as any).defaultCostCents ?? null;
    if (cost != null) itemCostMap.set(normName(item.name), cost);
  }

  // Single pass over cookLogs for all aggregations
  const now = new Date();
  const nowMs = now.getTime();
  const twelveWeeksAgo = new Date(nowMs - 12 * 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);

  let totalPeopleServed = 0;
  let ratingSum = 0;
  let wouldRepeatCount = 0;
  let last30DaysMeals = 0;
  let recentMeals = 0; // last 12 weeks
  let totalCostCents = 0;
  let costedMeals = 0;
  let uniqueCuisinesSet = new Set<string>();

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const cuisineCounts: Record<string, number> = {};
  const recipeCounts: Record<string, { title: string; count: number; ratings: number[] }> = {};
  const monthlyActivity: Record<string, number> = {};
  const cookDateSet = new Set<string>();

  for (const log of cookLogs) {
    const cookedOn = new Date(log.cookedOn);

    totalPeopleServed += log.servedTo || 0;
    ratingSum += log.rating;
    ratingDistribution[log.rating] = (ratingDistribution[log.rating] || 0) + 1;
    if (log.wouldRepeat) wouldRepeatCount++;
    if (cookedOn >= thirtyDaysAgo) last30DaysMeals++;
    if (cookedOn >= twelveWeeksAgo) recentMeals++;

    // Cuisine
    const cuisine = log.recipe.cuisine || "Unspecified";
    cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
    if (log.recipe.cuisine) uniqueCuisinesSet.add(log.recipe.cuisine);

    // Recipe frequency
    if (!recipeCounts[log.recipeId]) {
      recipeCounts[log.recipeId] = { title: log.recipe.title, count: 0, ratings: [] };
    }
    recipeCounts[log.recipeId].count++;
    recipeCounts[log.recipeId].ratings.push(log.rating);

    // Monthly activity
    const key = `${cookedOn.getFullYear()}-${String(cookedOn.getMonth() + 1).padStart(2, "0")}`;
    monthlyActivity[key] = (monthlyActivity[key] || 0) + 1;

    // Cook dates for streak
    cookDateSet.add(cookedOn.toISOString().split("T")[0]);

    // Cost per meal (ingredients now included in cookLogs query)
    let recipeCost = 0;
    let anyMatched = false;
    for (const ing of log.recipe.ingredients) {
      const c = itemCostMap.get(normName(ing.name));
      if (c != null) { recipeCost += c; anyMatched = true; }
    }
    if (anyMatched && log.recipe.servings && log.recipe.servings > 0) {
      totalCostCents += Math.round(recipeCost / log.recipe.servings);
      costedMeals++;
    }
  }

  const totalMeals = cookLogs.length;
  const avgRating = totalMeals > 0 ? ratingSum / totalMeals : 0;
  const wouldRepeatPct = totalMeals > 0 ? (wouldRepeatCount / totalMeals) * 100 : 0;
  const weeksElapsed = Math.max(1, Math.ceil((nowMs - twelveWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const avgMealsPerWeek = recentMeals / weeksElapsed;
  const avgCostPerMealCents = costedMeals > 0 ? Math.round(totalCostCents / costedMeals) : null;

  // Derived aggregations from maps
  const topCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cuisine, count]) => ({ cuisine, count }));

  const recipeEntries = Object.entries(recipeCounts).map(([id, d]) => ({
    id, title: d.title, count: d.count,
    avgRating: d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length
  }));

  const mostCooked = [...recipeEntries].sort((a, b) => b.count - a.count).slice(0, 5);
  const highestRated = recipeEntries
    .filter(r => r.count >= 2)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5);

  // Streak calculation
  const uniqueCookDates = [...cookDateSet].sort().reverse();
  const today = now.toISOString().split("T")[0];
  const yesterday = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  let currentStreak = 0;
  if (uniqueCookDates[0] === today || uniqueCookDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < uniqueCookDates.length; i++) {
      const diff = (new Date(uniqueCookDates[i - 1]).getTime() - new Date(uniqueCookDates[i]).getTime()) / 86400000;
      if (diff === 1) currentStreak++; else break;
    }
  }

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < uniqueCookDates.length; i++) {
    if (i === 0) { run = 1; continue; }
    const diff = (new Date(uniqueCookDates[i - 1]).getTime() - new Date(uniqueCookDates[i]).getTime()) / 86400000;
    run = diff === 1 ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
  }
  if (uniqueCookDates.length > 0 && longestStreak === 0) longestStreak = 1;

  // Technique stats (already fetched in parallel)
  const techniqueStats = techniques.map(t => ({
    id: t.id,
    name: t.name,
    comfort: t.comfort,
    difficulty: t.difficulty,
    recipesCount: t.recipes.length,
    timesUsed: t.recipes.reduce((sum, rt) => sum + rt.recipe.cookLogs.length, 0)
  })).sort((a, b) => b.timesUsed - a.timesUsed);

  const comfortDistribution = {
    untried:    techniques.filter(t => t.comfort === 0).length,
    learning:   techniques.filter(t => t.comfort === 1).length,
    comfortable: techniques.filter(t => t.comfort === 2).length,
    confident:  techniques.filter(t => t.comfort === 3).length
  };

  return NextResponse.json({
    overview: {
      totalMeals,
      totalRecipes,
      totalPeopleServed,
      avgRating: Math.round(avgRating * 10) / 10,
      wouldRepeatPct: Math.round(wouldRepeatPct),
      avgMealsPerWeek: Math.round(avgMealsPerWeek * 10) / 10,
      last30DaysMeals,
      currentStreak,
      longestStreak,
      uniqueCuisinesCooked: uniqueCuisinesSet.size,
      avgCostPerMealCents
    },
    ratingDistribution,
    topCuisines,
    mostCooked,
    highestRated,
    monthlyActivity,
    techniqueStats,
    comfortDistribution,
    showGamification: prefsRow?.showGamification ?? false
  });
}
