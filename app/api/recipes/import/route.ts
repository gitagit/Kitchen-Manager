import { NextResponse } from "next/server";
import { z } from "zod";

const ImportSchema = z.object({
  url: z.string().url()
});

type ParsedRecipe = {
  title: string;
  servings: number;
  totalMin: number;
  handsOnMin: number;
  ingredients: { name: string; quantityText: string | null }[];
  instructions: string;
  cuisine: string | null;
  source: string;
  sourceRef: string;
};

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = ImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const { url } = parsed.data;

  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KitchenManager/1.0; Recipe Import)",
        "Accept": "text/html,application/xhtml+xml"
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();

    // Try to extract JSON-LD Recipe data
    const recipe = extractRecipeFromHtml(html, url);

    if (!recipe) {
      return NextResponse.json({ error: "Could not find recipe data on this page" }, { status: 400 });
    }

    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("Recipe import error:", err);
    return NextResponse.json({ error: "Failed to fetch or parse the URL" }, { status: 500 });
  }
}

function extractRecipeFromHtml(html: string, sourceUrl: string): ParsedRecipe | null {
  // Try JSON-LD first (most reliable)
  const jsonLdRecipe = extractJsonLd(html);
  if (jsonLdRecipe) {
    return normalizeJsonLdRecipe(jsonLdRecipe, sourceUrl);
  }

  // Could add fallback HTML parsing here for sites without JSON-LD
  // For now, return null if no JSON-LD found
  return null;
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  // Find all JSON-LD script tags
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonStr = match[1].trim();
      const data = JSON.parse(jsonStr);

      // Handle array of items
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Check if it's a Recipe directly
        if (item["@type"] === "Recipe") {
          return item;
        }

        // Check @graph for Recipe
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          const recipe = item["@graph"].find(
            (g: Record<string, unknown>) =>
              g["@type"] === "Recipe" ||
              (Array.isArray(g["@type"]) && g["@type"].includes("Recipe"))
          );
          if (recipe) return recipe;
        }

        // Check if @type is an array containing Recipe
        if (Array.isArray(item["@type"]) && item["@type"].includes("Recipe")) {
          return item;
        }
      }
    } catch {
      // Invalid JSON, continue to next script tag
      continue;
    }
  }

  return null;
}

function normalizeJsonLdRecipe(data: Record<string, unknown>, sourceUrl: string): ParsedRecipe {
  // Extract title
  const title = String(data.name || "Untitled Recipe");

  // Extract servings
  let servings = 2;
  if (data.recipeYield) {
    const yieldStr = Array.isArray(data.recipeYield)
      ? data.recipeYield[0]
      : data.recipeYield;
    const match = String(yieldStr).match(/\d+/);
    if (match) servings = parseInt(match[0], 10);
  }

  // Extract times (in minutes)
  const totalMin = parseDuration(data.totalTime as string) || 30;
  const handsOnMin = parseDuration(data.prepTime as string) || Math.round(totalMin / 2);

  // Extract ingredients
  const ingredients: { name: string; quantityText: string | null }[] = [];
  if (Array.isArray(data.recipeIngredient)) {
    for (const ing of data.recipeIngredient) {
      const ingStr = String(ing).trim();
      // Try to split quantity from ingredient name
      const { quantity, name } = parseIngredientString(ingStr);
      ingredients.push({ name, quantityText: quantity });
    }
  }

  // Extract instructions
  let instructions = "";
  if (data.recipeInstructions) {
    if (typeof data.recipeInstructions === "string") {
      instructions = data.recipeInstructions;
    } else if (Array.isArray(data.recipeInstructions)) {
      instructions = data.recipeInstructions
        .map((step, i) => {
          if (typeof step === "string") return `${i + 1}. ${step}`;
          if (step.text) return `${i + 1}. ${step.text}`;
          if (step.name) return `${i + 1}. ${step.name}`;
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
  }

  // Extract cuisine
  let cuisine: string | null = null;
  if (data.recipeCuisine) {
    cuisine = Array.isArray(data.recipeCuisine)
      ? data.recipeCuisine[0]
      : String(data.recipeCuisine);
  }

  // Determine source type
  const hostname = new URL(sourceUrl).hostname.replace("www.", "");

  return {
    title,
    servings,
    totalMin,
    handsOnMin,
    ingredients,
    instructions,
    cuisine,
    source: "WEB",
    sourceRef: sourceUrl
  };
}

function parseDuration(iso8601: string | undefined): number | null {
  if (!iso8601) return null;

  // Parse ISO 8601 duration (e.g., "PT30M", "PT1H30M", "PT45M")
  const match = String(iso8601).match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return null;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);

  return hours * 60 + minutes;
}

function parseIngredientString(ingStr: string): { quantity: string | null; name: string } {
  // Try to match common patterns like "2 cups flour" or "1/2 tsp salt"
  const match = ingStr.match(/^([\d\/\.\s]+(?:\s*(?:cup|cups|tbsp|tsp|oz|lb|g|kg|ml|l|pound|pounds|ounce|ounces|tablespoon|tablespoons|teaspoon|teaspoons|clove|cloves|can|cans|bunch|bunches|piece|pieces|slice|slices|medium|large|small)s?)?)\s+(.+)$/i);

  if (match) {
    return {
      quantity: match[1].trim(),
      name: match[2].trim()
    };
  }

  // If no match, return the whole string as the name
  return { quantity: null, name: ingStr };
}
