import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { normName } from "@/lib/normalize";

export async function GET() {
  // Fetch all cook logs with recipe info
  const cookLogs = await prisma.cookLog.findMany({
    include: {
      recipe: {
        select: { id: true, title: true, cuisine: true, difficulty: true }
      }
    },
    orderBy: { cookedOn: "asc" }
  });

  // Fetch all techniques
  const techniques = await prisma.technique.findMany({
    include: {
      recipes: {
        include: {
          recipe: {
            include: {
              cookLogs: { select: { id: true } }
            }
          }
        }
      }
    }
  });

  // Fetch total recipe count
  const totalRecipes = await prisma.recipe.count();

  // Calculate stats
  const totalMeals = cookLogs.length;
  const totalPeopleServed = cookLogs.reduce((sum, log) => sum + (log.servedTo || 0), 0);

  // Rating distribution
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  cookLogs.forEach(log => {
    ratingDistribution[log.rating] = (ratingDistribution[log.rating] || 0) + 1;
  });

  // Average rating
  const avgRating = totalMeals > 0
    ? cookLogs.reduce((sum, log) => sum + log.rating, 0) / totalMeals
    : 0;

  // Would repeat percentage
  const wouldRepeatCount = cookLogs.filter(log => log.wouldRepeat).length;
  const wouldRepeatPct = totalMeals > 0 ? (wouldRepeatCount / totalMeals) * 100 : 0;

  // Cuisine breakdown
  const cuisineCounts: Record<string, number> = {};
  cookLogs.forEach(log => {
    const cuisine = log.recipe.cuisine || "Unspecified";
    cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
  });
  const topCuisines = Object.entries(cuisineCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cuisine, count]) => ({ cuisine, count }));

  // Recipe frequency (most cooked)
  const recipeCounts: Record<string, { title: string; count: number; avgRating: number; ratings: number[] }> = {};
  cookLogs.forEach(log => {
    if (!recipeCounts[log.recipeId]) {
      recipeCounts[log.recipeId] = { title: log.recipe.title, count: 0, avgRating: 0, ratings: [] };
    }
    recipeCounts[log.recipeId].count++;
    recipeCounts[log.recipeId].ratings.push(log.rating);
  });
  Object.values(recipeCounts).forEach(r => {
    r.avgRating = r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length;
  });

  const mostCooked = Object.entries(recipeCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, data]) => ({ id, title: data.title, count: data.count, avgRating: data.avgRating }));

  const highestRated = Object.entries(recipeCounts)
    .filter(([, data]) => data.count >= 2) // At least 2 cooks for meaningful rating
    .sort((a, b) => b[1].avgRating - a[1].avgRating)
    .slice(0, 5)
    .map(([id, data]) => ({ id, title: data.title, count: data.count, avgRating: data.avgRating }));

  // Cooking frequency by month
  const monthlyActivity: Record<string, number> = {};
  cookLogs.forEach(log => {
    const date = new Date(log.cookedOn);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyActivity[key] = (monthlyActivity[key] || 0) + 1;
  });

  // Weekly average (last 12 weeks)
  const now = new Date();
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const recentLogs = cookLogs.filter(log => new Date(log.cookedOn) >= twelveWeeksAgo);
  const weeksElapsed = Math.max(1, Math.ceil((now.getTime() - twelveWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const avgMealsPerWeek = recentLogs.length / weeksElapsed;

  // Technique stats
  const techniqueStats = techniques.map(t => {
    const recipesWithTechnique = t.recipes.length;
    const cookedWithTechnique = t.recipes.reduce((sum, rt) => sum + rt.recipe.cookLogs.length, 0);
    return {
      id: t.id,
      name: t.name,
      comfort: t.comfort,
      difficulty: t.difficulty,
      recipesCount: recipesWithTechnique,
      timesUsed: cookedWithTechnique
    };
  }).sort((a, b) => b.timesUsed - a.timesUsed);

  // Comfort level distribution
  const comfortDistribution = {
    untried: techniques.filter(t => t.comfort === 0).length,
    learning: techniques.filter(t => t.comfort === 1).length,
    comfortable: techniques.filter(t => t.comfort === 2).length,
    confident: techniques.filter(t => t.comfort === 3).length
  };

  // Avg cost per meal
  const allItems = await prisma.item.findMany({ include: { batches: true } });
  const itemCostMap = new Map<string, number>();
  for (const item of allItems) {
    const cost = (item.batches[0] as any)?.costCents ?? (item as any).defaultCostCents ?? null;
    if (cost != null) itemCostMap.set(normName(item.name), cost);
  }

  const allRecipesWithIngredients = await prisma.recipe.findMany({ include: { ingredients: true } });
  const recipeIngMap = new Map(allRecipesWithIngredients.map(r => [r.id, r]));

  let totalCostCents = 0;
  let costedMeals = 0;
  for (const log of cookLogs) {
    const recipe = recipeIngMap.get(log.recipeId);
    if (!recipe) continue;
    let recipeCost = 0;
    let anyMatched = false;
    for (const ing of recipe.ingredients) {
      const c = itemCostMap.get(normName(ing.name));
      if (c != null) { recipeCost += c; anyMatched = true; }
    }
    if (anyMatched && recipe.servings > 0) {
      totalCostCents += Math.round(recipeCost / recipe.servings);
      costedMeals++;
    }
  }
  const avgCostPerMealCents = costedMeals > 0 ? Math.round(totalCostCents / costedMeals) : null;

  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30Days = cookLogs.filter(log => new Date(log.cookedOn) >= thirtyDaysAgo);

  // Streak calculation (consecutive days with cooking)
  const uniqueCookDates = [...new Set(cookLogs.map(log =>
    new Date(log.cookedOn).toISOString().split("T")[0]
  ))].sort().reverse();

  let currentStreak = 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  if (uniqueCookDates[0] === today || uniqueCookDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < uniqueCookDates.length; i++) {
      const prevDate = new Date(uniqueCookDates[i - 1]);
      const currDate = new Date(uniqueCookDates[i]);
      const diffDays = (prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Longest streak ever (full scan)
  let longestStreak = 0;
  let runLength = 0;
  for (let i = 0; i < uniqueCookDates.length; i++) {
    if (i === 0) { runLength = 1; continue; }
    const prev = new Date(uniqueCookDates[i - 1]);
    const curr = new Date(uniqueCookDates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000);
    runLength = diff === 1 ? runLength + 1 : 1;
    if (runLength > longestStreak) longestStreak = runLength;
  }
  if (uniqueCookDates.length > 0 && longestStreak === 0) longestStreak = 1;

  // Unique cuisines ever cooked
  const uniqueCuisinesCooked = new Set(
    cookLogs.map(log => log.recipe?.cuisine).filter(Boolean)
  ).size;

  // Gamification preference
  const prefsRow = await prisma.userPreferences.findFirst({ select: { showGamification: true } });
  const showGamification = prefsRow?.showGamification ?? false;

  return NextResponse.json({
    overview: {
      totalMeals,
      totalRecipes,
      totalPeopleServed,
      avgRating: Math.round(avgRating * 10) / 10,
      wouldRepeatPct: Math.round(wouldRepeatPct),
      avgMealsPerWeek: Math.round(avgMealsPerWeek * 10) / 10,
      last30DaysMeals: last30Days.length,
      currentStreak,
      longestStreak,
      uniqueCuisinesCooked,
      avgCostPerMealCents
    },
    ratingDistribution,
    topCuisines,
    mostCooked,
    highestRated,
    monthlyActivity,
    techniqueStats,
    comfortDistribution,
    showGamification
  });
}
