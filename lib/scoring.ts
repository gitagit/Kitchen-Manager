import type { Item, ItemBatch, Recipe, RecipeIngredient, CookLog, Technique, RecipeTechnique } from "@prisma/client";
import { normName } from "@/lib/normalize";

export type SuggestConstraints = {
  servings?: number;
  maxTotalMin?: number;
  equipment?: string[]; // ["OVEN","STOVETOP","INSTANT_POT","AIR_FRYER"]
  tagsInclude?: string[];
  tagsExclude?: string[];
  mustUse?: string[]; // ingredient names
  occasion?: "WEEKNIGHT" | "POTLUCK" | "MEAL_PREP" | "ANY";
  
  // New constraints
  cuisine?: string;           // filter to specific cuisine
  wantVariety?: boolean;      // boost cuisines not cooked recently
  wantGrowth?: boolean;       // boost recipes that teach new techniques
  complexity?: "FAMILIAR" | "STRETCH" | "CHALLENGE" | "ANY";
  season?: "SPRING" | "SUMMER" | "FALL" | "WINTER";
};

export type SuggestResult = {
  recipeId: string;
  title: string;
  score: number;
  have: string[];
  missing: string[];
  swaps: Record<string, string[]>;
  why: string[];
  
  // New metadata
  cuisine?: string;
  complexity?: string;
  techniques?: string[];
};

type FullRecipe = Recipe & { 
  ingredients: RecipeIngredient[]; 
  cookLogs: CookLog[];
  techniques?: (RecipeTechnique & { technique: Technique })[];
};

type CuisineHistory = Map<string, Date>; // cuisine -> last cooked date
type TechniqueComfort = Map<string, number>; // technique name -> comfort level (0-3)

function hasTag(recipe: FullRecipe, tag: string): boolean {
  const tags = (recipe.tags as unknown as string[]) ?? [];
  return tags.map(normName).includes(normName(tag));
}

function hasSeason(recipe: FullRecipe, season: string): boolean {
  const seasons = (recipe.seasons as unknown as string[]) ?? [];
  if (seasons.length === 0) return true; // no seasons = any season
  return seasons.map(normName).includes(normName(season));
}

function hasEquipment(recipe: FullRecipe, requiredEquip: string[]): boolean {
  if (!requiredEquip?.length) return true;
  const equip = ((recipe.equipment as unknown as string[]) ?? []).map(normName);
  return requiredEquip.every((e) => equip.includes(normName(e)));
}

export function scoreRecipe(
  recipe: FullRecipe,
  invNames: Set<string>,
  expiringNames: Set<string>,
  constraints: SuggestConstraints,
  cuisineHistory?: CuisineHistory,
  techniqueComfort?: TechniqueComfort
): SuggestResult {
  const required = recipe.ingredients.filter((i) => i.required);
  const optional = recipe.ingredients.filter((i) => !i.required);

  const have: string[] = [];
  const missing: string[] = [];
  const swaps: Record<string, string[]> = {};

  for (const ing of required) {
    const n = normName(ing.name);
    if (invNames.has(n)) {
      have.push(ing.name);
    } else {
      // See if any substitution exists in inventory
      const subs = ((ing.substitutions as unknown as string[]) ?? []).filter(Boolean);
      const hit = subs.find((s) => invNames.has(normName(s)));
      if (hit) {
        have.push(`${ing.name} (swap: ${hit})`);
        swaps[ing.name] = [hit];
      } else {
        missing.push(ing.name);
        if (subs.length) swaps[ing.name] = subs;
      }
    }
  }

  // Coverage / missing penalties
  const requiredCount = Math.max(required.length, 1);
  const missingCount = missing.length;
  const coverage = (requiredCount - missingCount) / requiredCount; // 0..1

  let score = 0;
  const why: string[] = [];

  // Coverage is king
  score += coverage * 60;
  why.push(`Coverage ${(coverage * 100).toFixed(0)}%`);

  // Missing penalty (hard)
  score -= missingCount * 12;
  if (missingCount) why.push(`Missing ${missingCount} required`);

  // Expiring bonus
  const usesExpiring =
    [...required, ...optional].some((i) => expiringNames.has(normName(i.name)));
  if (usesExpiring) {
    score += 12;
    why.push("Uses expiring item");
  }

  // Must-use bonus/penalty
  const mustUse = (constraints.mustUse ?? []).map(normName);
  if (mustUse.length) {
    const recipeIngs = [...required, ...optional].map((i) => normName(i.name));
    const hitCount = mustUse.filter((m) => recipeIngs.includes(m)).length;
    score += hitCount * 8;
    if (hitCount) why.push(`Hits ${hitCount}/${mustUse.length} must-use`);
    if (hitCount === 0) score -= 8;
  }

  // Time fit
  if (constraints.maxTotalMin != null) {
    const delta = recipe.totalMin - constraints.maxTotalMin;
    if (delta <= 0) {
      score += 8;
      why.push("Within time");
    } else {
      score -= Math.min(20, delta * 0.6);
      why.push(`Over time by ${delta}m`);
    }
  }

  // Equipment fit
  if (constraints.equipment?.length) {
    if (hasEquipment(recipe, constraints.equipment)) {
      score += 8;
      why.push("Equipment match");
    } else {
      score -= 25;
      why.push("Equipment mismatch");
    }
  }

  // Tags include/exclude
  const include = constraints.tagsInclude ?? [];
  const exclude = constraints.tagsExclude ?? [];
  for (const t of include) {
    if (hasTag(recipe, t)) score += 5;
    else score -= 6;
  }
  for (const t of exclude) {
    if (hasTag(recipe, t)) score -= 10;
  }

  // Occasion shortcut
  if (constraints.occasion && constraints.occasion !== "ANY") {
    if (hasTag(recipe, constraints.occasion)) score += 6;
    else score -= 3;
  }

  // === NEW: Season fit ===
  if (constraints.season) {
    if (hasSeason(recipe, constraints.season)) {
      score += 5;
      why.push("In season");
    } else {
      score -= 8;
    }
  }

  // === NEW: Cuisine filter and variety ===
  const recipeCuisine = recipe.cuisine ? normName(recipe.cuisine) : null;
  
  if (constraints.cuisine) {
    if (recipeCuisine === normName(constraints.cuisine)) {
      score += 10;
      why.push(`Cuisine: ${recipe.cuisine}`);
    } else {
      score -= 15;
    }
  }
  
  // Cuisine variety bonus (if enabled and we have history)
  if (constraints.wantVariety && cuisineHistory && recipeCuisine) {
    const lastCooked = cuisineHistory.get(recipeCuisine);
    if (!lastCooked) {
      // Never cooked this cuisine - big bonus!
      score += 15;
      why.push("New cuisine!");
    } else {
      const daysAgo = (Date.now() - lastCooked.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo > 21) {
        score += 8;
        why.push("Cuisine variety");
      } else if (daysAgo < 7) {
        score -= 4; // Had this cuisine recently
      }
    }
  }

  // === NEW: Complexity filter ===
  if (constraints.complexity && constraints.complexity !== "ANY") {
    if (recipe.complexity === constraints.complexity) {
      score += 8;
      why.push(`Complexity: ${recipe.complexity.toLowerCase()}`);
    } else {
      score -= 5;
    }
  }

  // === NEW: Growth/technique bonus ===
  const recipeTechniques = recipe.techniques?.map(t => t.technique) ?? [];
  const techniqueNames = recipeTechniques.map(t => t.name);
  
  if (constraints.wantGrowth && techniqueComfort && recipeTechniques.length > 0) {
    // Count techniques you haven't mastered yet
    const learningOpportunities = recipeTechniques.filter(t => {
      const comfort = techniqueComfort.get(normName(t.name)) ?? 0;
      return comfort < 2; // 0=untried, 1=learning
    });
    
    if (learningOpportunities.length > 0) {
      // Bonus for learning, but not too much if difficulty is high
      const techBonus = Math.min(learningOpportunities.length * 6, 15);
      score += techBonus;
      why.push(`Learn: ${learningOpportunities.map(t => t.name).join(", ")}`);
    }
    
    // Small bonus for practicing techniques you're still learning
    const practiceOps = recipeTechniques.filter(t => {
      const comfort = techniqueComfort.get(normName(t.name)) ?? 0;
      return comfort === 1; // still learning
    });
    if (practiceOps.length > 0 && learningOpportunities.length === 0) {
      score += 4;
      why.push("Practice opportunity");
    }
  }

  // Favorites + recency + wouldRepeat
  const logs = recipe.cookLogs ?? [];
  if (logs.length) {
    const avg = logs.reduce((a, l) => a + l.rating, 0) / logs.length;
    score += (avg - 3) * 6; // above 3 boosts
    const last = logs
      .map((l) => l.cookedOn.getTime())
      .sort((a, b) => b - a)[0];
    const daysAgo = (Date.now() - last) / (1000 * 60 * 60 * 24);
    if (daysAgo < 14) score -= 6; // variety
    if (avg >= 4) why.push("High rated");

    // wouldRepeat factor
    const hasNoRepeat = logs.some((l) => l.wouldRepeat === false);
    const allWouldRepeat = logs.every((l) => l.wouldRepeat !== false);
    if (hasNoRepeat) {
      score -= 8;
      why.push("Marked wouldn't repeat");
    } else if (allWouldRepeat && avg >= 4) {
      score += 4;
      why.push("Favorite");
    }
  }

  return {
    recipeId: recipe.id,
    title: recipe.title,
    score: Math.round(score * 10) / 10,
    have,
    missing,
    swaps,
    why,
    cuisine: recipe.cuisine ?? undefined,
    complexity: recipe.complexity,
    techniques: techniqueNames.length > 0 ? techniqueNames : undefined
  };
}

// Helper to build cuisine history from all cook logs
export function buildCuisineHistory(
  recipes: (Recipe & { cookLogs: CookLog[] })[]
): CuisineHistory {
  const history = new Map<string, Date>();
  
  for (const recipe of recipes) {
    if (!recipe.cuisine) continue;
    const cuisine = normName(recipe.cuisine);
    
    for (const log of recipe.cookLogs) {
      const existing = history.get(cuisine);
      if (!existing || log.cookedOn > existing) {
        history.set(cuisine, log.cookedOn);
      }
    }
  }
  
  return history;
}

// Helper to build technique comfort map
export function buildTechniqueComfort(
  techniques: Technique[]
): TechniqueComfort {
  const comfort = new Map<string, number>();
  for (const t of techniques) {
    comfort.set(normName(t.name), t.comfort);
  }
  return comfort;
}
