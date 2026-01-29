/**
 * Import recipes from recipe_book.json into the database
 *
 * Run with: npx tsx scripts/import-recipes.ts [path-to-json]
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

type ImportRecipe = {
  id: string;
  title: string;
  aliases: string[];
  summary: string;
  servings: { default: number; min: number; max: number; scalable: boolean };
  time: { handsOnMin: number; totalMin: number };
  difficulty: number;
  equipment: string[];
  tags: string[];
  ingredients: {
    name: string;
    quantityText: string;
    optional: boolean;
    categoryHint: string;
    substitutions: string[];
    notes: string;
  }[];
  steps: string[];
  notes: string[];
  variations: string[];
  dedupe: { groupKey: string; nearDuplicates: string[]; dedupeNotes: string };
  sources: { type: string; threadHint?: string; timestampHint?: string; confidence?: string }[];
  status: string; // "ready" or "needs_review"
};

async function importRecipes(jsonPath: string) {
  console.log(`Reading recipes from: ${jsonPath}`);

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);
  const recipes: ImportRecipe[] = data.recipeBook?.recipes || data.recipes || data;

  console.log(`Found ${recipes.length} recipes to import\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const r of recipes) {
    try {
      // Skip recipes flagged for review
      if (r.status === "needs_review") {
        console.log(`⏭️  Skipping "${r.title}" - needs review`);
        skipped++;
        continue;
      }

      // Skip recipes with potential duplicates if flagged
      if (r.dedupe?.nearDuplicates?.length > 0) {
        console.log(`⏭️  Skipping "${r.title}" - flagged as potential duplicate`);
        skipped++;
        continue;
      }

      // Filter out malformed ingredients (like markdown headers)
      const validIngredients = r.ingredients.filter(i =>
        i.name &&
        !i.name.startsWith("#") &&
        !i.name.startsWith("**") &&
        i.name.length < 200
      );

      // Skip if no valid ingredients
      if (validIngredients.length === 0) {
        console.log(`⏭️  Skipping "${r.title}" - no valid ingredients`);
        skipped++;
        continue;
      }

      // Combine steps into instructions string
      const instructions = r.steps.join("\n");

      // Map to our schema (equipment, tags, seasons are JSON strings in DB)
      const recipeData = {
        title: r.title.trim(),
        servings: r.servings.default || 2,
        servingsMax: r.servings.max || null,
        handsOnMin: r.time.handsOnMin || 15,
        totalMin: r.time.totalMin || 30,
        difficulty: Math.min(5, Math.max(1, r.difficulty || 3)),
        equipment: JSON.stringify(r.equipment || []),
        tags: JSON.stringify(r.tags || []),
        seasons: JSON.stringify([]),
        instructions: instructions || r.summary || "",
        source: "PERSONAL" as const,
        sourceRef: r.sources?.[0]?.threadHint || null,
        cuisine: null,
        complexity: "FAMILIAR" as const,
      };

      // Upsert recipe
      const created = await prisma.recipe.upsert({
        where: { title: recipeData.title },
        update: {
          ...recipeData,
          ingredients: {
            deleteMany: {},
            create: validIngredients.map(i => ({
              name: i.name.trim(),
              required: !i.optional,
              quantityText: i.quantityText?.trim() || null,
              preparation: null,
              categoryHint: i.categoryHint || null,
              substitutions: JSON.stringify(i.substitutions || []),
            })),
          },
        },
        create: {
          ...recipeData,
          ingredients: {
            create: validIngredients.map(i => ({
              name: i.name.trim(),
              required: !i.optional,
              quantityText: i.quantityText?.trim() || null,
              preparation: null,
              categoryHint: i.categoryHint || null,
              substitutions: JSON.stringify(i.substitutions || []),
            })),
          },
        },
      });

      console.log(`✅ Imported: "${created.title}"`);
      imported++;
    } catch (err) {
      console.error(`❌ Error importing "${r.title}":`, err);
      errors++;
    }
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Import complete!`);
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
}

async function main() {
  const jsonPath = process.argv[2] || "C:/Users/green/Downloads/recipe_book.json";

  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  try {
    await importRecipes(jsonPath);
  } finally {
    await prisma.$disconnect();
  }
}

main();
