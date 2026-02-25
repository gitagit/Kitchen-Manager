/**
 * Create a test user with a seeded workspace, inventory, techniques, and recipes.
 * Safe to re-run — all operations are idempotent (upsert / skip if exists).
 *
 * Usage:
 *   npx tsx scripts/create-test-user.ts
 *   npx tsx scripts/create-test-user.ts --email alice@test.com --password secret --workspace "Alice's Kitchen"
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── CLI args ──────────────────────────────────────────────────────────────────
function arg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const email         = arg("--email",     "test@example.com");
const password      = arg("--password",  "password123");
const workspaceName = arg("--workspace", "Test Kitchen");

// ── Data ──────────────────────────────────────────────────────────────────────

const techniqueData = [
  { name: "sautéing",     description: "Cooking quickly in a small amount of fat over high heat",                      difficulty: 1, comfort: 3 },
  { name: "roasting",     description: "Cooking with dry heat in an oven",                                             difficulty: 2, comfort: 2 },
  { name: "braising",     description: "Slow cooking in liquid for tender, flavorful results",                         difficulty: 3, comfort: 1 },
  { name: "blanching",    description: "Brief boiling followed by ice bath to set color and texture",                  difficulty: 2, comfort: 1 },
  { name: "marinating",   description: "Soaking protein or vegetables in seasoned liquid to add flavor and tenderize", difficulty: 1, comfort: 2 },
  { name: "reduction",    description: "Concentrating flavors by simmering to evaporate liquid",                       difficulty: 2, comfort: 2 },
  { name: "knife skills", description: "Efficient, safe cutting techniques for prep work",                             difficulty: 2, comfort: 3 },
];

const itemsData = [
  // Oils
  { name: "olive oil",               category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "~half bottle (500ml)" } },
  { name: "vegetable oil",           category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "1 bottle (32oz)" } },
  { name: "sesame oil",              category: "CONDIMENT", location: "PANTRY",  staple: true,  batch: { quantityText: "1 bottle (8oz), toasted" } },
  // Condiments
  { name: "soy sauce",               category: "CONDIMENT", location: "PANTRY",  staple: true,  batch: { quantityText: "1 bottle, low sodium (15oz)" } },
  { name: "oyster sauce",            category: "CONDIMENT", location: "PANTRY",  staple: false, batch: { quantityText: "1 bottle (9oz)" } },
  { name: "fish sauce",              category: "CONDIMENT", location: "PANTRY",  staple: true,  batch: { quantityText: "1 bottle (8.45oz)" } },
  { name: "dijon mustard",           category: "CONDIMENT", location: "FRIDGE",  staple: true,  batch: { quantityText: "1 jar (8oz)" } },
  { name: "hot sauce",               category: "CONDIMENT", location: "PANTRY",  staple: true,  batch: { quantityText: "1 bottle (Frank's, 12oz)" } },
  { name: "honey",                   category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "1 jar (12oz)" } },
  // Pantry staples
  { name: "spaghetti",               category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "1 lb box" } },
  { name: "jasmine rice",            category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "5 lb bag, ~half full" } },
  { name: "canned crushed tomatoes", category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "2 cans (28oz each)" } },
  { name: "canned chickpeas",        category: "PANTRY",    location: "PANTRY",  staple: false, batch: { quantityText: "2 cans (15oz each)" } },
  { name: "chicken broth",           category: "PANTRY",    location: "PANTRY",  staple: true,  batch: { quantityText: "2 cartons (32oz each)" } },
  { name: "cornstarch",              category: "BAKING",    location: "PANTRY",  staple: true,  batch: { quantityText: "1 box (16oz), ~¾ full" } },
  // Spices
  { name: "garlic",                  category: "PRODUCE",   location: "COUNTER", staple: true,  batch: { quantityText: "1 head" } },
  { name: "ginger",                  category: "PRODUCE",   location: "FRIDGE",  staple: false, batch: { quantityText: "small knob (~3 inches)" } },
  { name: "cumin",                   category: "SPICE",     location: "PANTRY",  staple: true,  batch: { quantityText: "1 jar" } },
  { name: "smoked paprika",          category: "SPICE",     location: "PANTRY",  staple: true,  batch: { quantityText: "1 jar" } },
  { name: "red pepper flakes",       category: "SPICE",     location: "PANTRY",  staple: true,  batch: { quantityText: "1 jar" } },
  { name: "dried oregano",           category: "SPICE",     location: "PANTRY",  staple: true,  batch: { quantityText: "1 jar" } },
  { name: "black pepper",            category: "SPICE",     location: "PANTRY",  staple: true,  batch: { quantityText: "pepper mill, ~half full" } },
  { name: "kosher salt",             category: "SPICE",     location: "PANTRY",  staple: true,  batch: { quantityText: "1 box (3 lb), half full" } },
  // Dairy / refrigerated
  { name: "eggs",                    category: "DAIRY",     location: "FRIDGE",  staple: true,  batch: { quantityText: "1 dozen" } },
  { name: "unsalted butter",         category: "DAIRY",     location: "FRIDGE",  staple: true,  batch: { quantityText: "1 stick" } },
  { name: "parmesan",                category: "DAIRY",     location: "FRIDGE",  staple: false, batch: { quantityText: "wedge (~4oz)" } },
  // Produce
  { name: "yellow onion",            category: "PRODUCE",   location: "COUNTER", staple: true,  batch: { quantityText: "3 onions" } },
];

type Ingredient = {
  name: string;
  required: boolean;
  quantityText?: string;
  preparation?: string;
  substitutions?: string[];
};

type RecipeData = {
  title: string;
  servings: number;
  servingsMax?: number;
  handsOnMin: number;
  totalMin: number;
  difficulty: number;
  source: string;
  cuisine: string;
  complexity: string;
  equipment: string[];
  tags: string[];
  seasons: string[];
  instructions: string;
  ingredients: Ingredient[];
  techniqueNames: string[];
};

const recipesData: RecipeData[] = [
  {
    title: "Shakshuka",
    servings: 2, servingsMax: 4,
    handsOnMin: 15, totalMin: 30, difficulty: 2,
    source: "WEB", cuisine: "Israeli", complexity: "FAMILIAR",
    equipment: ["STOVETOP"],
    tags: ["VEGETARIAN", "WEEKNIGHT", "BREAKFAST"],
    seasons: [],
    instructions: [
      "Heat olive oil in a large skillet over medium heat. Add diced onion and cook until softened, about 7 minutes.",
      "Add garlic, cumin, and smoked paprika. Cook 1 minute until fragrant.",
      "Add crushed tomatoes, season with salt, and simmer 10 minutes until sauce thickens slightly.",
      "Use a spoon to make wells in the sauce. Crack an egg into each well. Cover and cook 5–7 minutes until whites are set but yolks are still runny.",
      "Top with crumbled feta, fresh parsley, and a pinch of red pepper flakes. Serve straight from the pan with crusty bread.",
    ].join("\n\n"),
    ingredients: [
      { name: "eggs",                    required: true,  quantityText: "4" },
      { name: "canned crushed tomatoes", required: true,  quantityText: "28 oz can" },
      { name: "yellow onion",            required: true,  quantityText: "1 medium",      preparation: "diced" },
      { name: "garlic",                  required: true,  quantityText: "4 cloves",      preparation: "minced" },
      { name: "olive oil",               required: true,  quantityText: "2 tbsp" },
      { name: "cumin",                   required: true,  quantityText: "1 tsp" },
      { name: "smoked paprika",          required: true,  quantityText: "1 tsp" },
      { name: "red pepper flakes",       required: false, quantityText: "1/4 tsp" },
      { name: "feta",                    required: false, quantityText: "2 oz",          preparation: "crumbled" },
      { name: "fresh parsley",           required: false, quantityText: "small handful", preparation: "chopped" },
    ],
    techniqueNames: ["sautéing", "reduction"],
  },
  {
    title: "Aglio e Olio",
    servings: 2,
    handsOnMin: 15, totalMin: 20, difficulty: 2,
    source: "FAMILY", cuisine: "Italian", complexity: "FAMILIAR",
    equipment: ["STOVETOP"],
    tags: ["WEEKNIGHT", "VEGETARIAN", "QUICK"],
    seasons: [],
    instructions: [
      "Bring a large pot of well-salted water to boil. Cook pasta until al dente, reserving 1 cup pasta water before draining.",
      "While pasta cooks, heat olive oil in a large skillet over medium-low heat. Add sliced garlic and cook gently until golden, about 3–4 minutes.",
      "Add red pepper flakes and remove from heat briefly.",
      "Add drained pasta to the skillet with 1/2 cup pasta water. Toss vigorously over medium heat, adding more water as needed until silky.",
      "Finish with chopped parsley, a drizzle more olive oil, and parmesan. Serve immediately.",
    ].join("\n\n"),
    ingredients: [
      { name: "spaghetti",         required: true,  quantityText: "8 oz" },
      { name: "olive oil",         required: true,  quantityText: "1/3 cup" },
      { name: "garlic",            required: true,  quantityText: "6 cloves", preparation: "thinly sliced" },
      { name: "red pepper flakes", required: false, quantityText: "1/2 tsp" },
      { name: "parmesan",          required: false, quantityText: "for serving" },
    ],
    techniqueNames: ["sautéing"],
  },
  {
    title: "Better Than Takeout Beef and Broccoli",
    servings: 4,
    handsOnMin: 25, totalMin: 35, difficulty: 3,
    source: "WEB", cuisine: "Chinese", complexity: "STRETCH",
    equipment: ["STOVETOP"],
    tags: ["WEEKNIGHT", "MEAL_PREP"],
    seasons: [],
    instructions: [
      "Slice beef against the grain into thin strips. Marinate with soy sauce, cornstarch, and a splash of oil for 15 min.",
      "Blanch broccoli in boiling water for 1 minute, then shock in ice water. Drain well.",
      "Mix sauce: soy sauce, oyster sauce, a pinch of sugar, and a cornstarch slurry.",
      "Heat a large skillet until very hot. Add oil, then sear beef in batches until browned. Remove and set aside.",
      "Add more oil, stir-fry garlic and ginger briefly. Add broccoli and toss to coat.",
      "Return beef, pour in sauce, toss until glossy and thickened. Serve over jasmine rice.",
    ].join("\n\n"),
    ingredients: [
      { name: "flank steak",  required: true,  quantityText: "1 lb",       preparation: "sliced thin",   substitutions: ["sirloin", "skirt steak"] },
      { name: "broccoli",     required: true,  quantityText: "1 lb",       preparation: "cut into florets" },
      { name: "soy sauce",    required: true,  quantityText: "3 tbsp" },
      { name: "oyster sauce", required: true,  quantityText: "2 tbsp" },
      { name: "garlic",       required: true,  quantityText: "3 cloves",   preparation: "minced" },
      { name: "ginger",       required: true,  quantityText: "1 inch",     preparation: "minced" },
      { name: "cornstarch",   required: true,  quantityText: "2 tbsp" },
      { name: "sesame oil",   required: false, quantityText: "1 tsp" },
      { name: "jasmine rice", required: false, quantityText: "for serving" },
    ],
    techniqueNames: ["sautéing", "blanching", "marinating"],
  },
  {
    title: "Honey Dijon Sheet Pan Salmon",
    servings: 2,
    handsOnMin: 10, totalMin: 25, difficulty: 1,
    source: "PERSONAL", cuisine: "American", complexity: "FAMILIAR",
    equipment: ["OVEN"],
    tags: ["WEEKNIGHT", "HEALTHY", "QUICK"],
    seasons: [],
    instructions: [
      "Preheat oven to 425°F. Line a sheet pan with parchment or foil.",
      "Whisk together soy sauce, Dijon mustard, honey, and melted butter.",
      "Place salmon on prepared pan. Season with black pepper. Brush glaze generously over salmon.",
      "Roast 12–14 minutes until salmon flakes easily with a fork.",
      "Finish with a squeeze of lemon and fresh herbs if desired. Serve immediately.",
    ].join("\n\n"),
    ingredients: [
      { name: "salmon fillet",   required: true,  quantityText: "1 lb" },
      { name: "soy sauce",       required: true,  quantityText: "1 tbsp" },
      { name: "dijon mustard",   required: true,  quantityText: "1 tbsp",  substitutions: ["whole grain mustard"] },
      { name: "honey",           required: true,  quantityText: "1 tbsp" },
      { name: "unsalted butter", required: true,  quantityText: "1 tbsp",  preparation: "melted", substitutions: ["olive oil"] },
      { name: "black pepper",    required: false, quantityText: "to taste" },
      { name: "lemon",           required: false, quantityText: "1/2" },
    ],
    techniqueNames: ["roasting"],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nCreating test user: ${email}`);
  console.log(`Workspace: "${workspaceName}"\n`);

  // User
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Test User", passwordHash },
  });
  console.log(`✓ User: ${user.email} (${user.id})`);

  // Workspace — re-use if this user already has one with this name
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
  });
  const workspace =
    existingMembership?.workspace.name === workspaceName
      ? existingMembership.workspace
      : await prisma.workspace.create({ data: { name: workspaceName } });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });
  const workspaceId = workspace.id;
  console.log(`✓ Workspace: "${workspace.name}" (${workspaceId})`);

  // Techniques
  for (const t of techniqueData) {
    await prisma.technique.upsert({
      where: { workspaceId_name: { workspaceId, name: t.name } },
      update: {},
      create: { workspaceId, ...t },
    });
  }
  // Build name → id map for recipe linking
  const techIdMap: Record<string, string> = {};
  for (const t of techniqueData) {
    const rec = await prisma.technique.findUnique({
      where: { workspaceId_name: { workspaceId, name: t.name } },
    });
    if (rec) techIdMap[t.name] = rec.id;
  }
  console.log(`✓ ${techniqueData.length} techniques`);

  // Inventory
  for (const { batch, ...fields } of itemsData) {
    const item = await prisma.item.upsert({
      where: { workspaceId_name: { workspaceId, name: fields.name } },
      update: {},
      create: { workspaceId, ...fields },
      include: { batches: true },
    });
    if (item.batches.length === 0) {
      await prisma.itemBatch.create({ data: { itemId: item.id, ...batch } });
    }
  }
  console.log(`✓ ${itemsData.length} inventory items`);

  // Recipes
  for (const { techniqueNames, ingredients, ...fields } of recipesData) {
    const existing = await prisma.recipe.findUnique({
      where: { workspaceId_title: { workspaceId, title: fields.title } },
    });
    if (!existing) {
      await prisma.recipe.create({
        data: {
          workspaceId,
          ...fields,
          ingredients: {
            create: ingredients.map(({ substitutions, ...ing }) => ({
              ...ing,
              substitutions: substitutions ?? [],
            })),
          },
          techniques: {
            create: techniqueNames
              .filter(n => techIdMap[n])
              .map(n => ({ techniqueId: techIdMap[n] })),
          },
        },
      });
    }
  }
  console.log(`✓ ${recipesData.length} recipes`);

  // Preferences
  await prisma.userPreferences.upsert({
    where: { workspaceId },
    update: {},
    create: {
      workspaceId,
      equipment: ["OVEN", "STOVETOP"],
      defaultServings: 2,
      defaultMaxTimeMin: 45,
      dietaryTagsExclude: [],
      cuisinesExclude: [],
      defaultComplexity: "ANY",
      wantVariety: true,
      wantGrowth: true,
    },
  });
  console.log(`✓ Preferences`);

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Test user ready!

  Email:     ${email}
  Password:  ${password}
  Workspace: ${workspaceName}

  Log in at: http://localhost:3000/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
