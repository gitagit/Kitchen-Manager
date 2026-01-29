import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// String constants (since SQLite doesn't support enums)
const ItemCategory = {
  PANTRY: "PANTRY",
  SPICE: "SPICE",
  FROZEN: "FROZEN",
  PRODUCE: "PRODUCE",
  MEAT: "MEAT",
  DAIRY: "DAIRY",
  CONDIMENT: "CONDIMENT",
  BAKING: "BAKING",
  BEVERAGE: "BEVERAGE",
  OTHER: "OTHER"
} as const;

const ItemLocation = {
  PANTRY: "PANTRY",
  FRIDGE: "FRIDGE",
  FREEZER: "FREEZER",
  COUNTER: "COUNTER",
  OTHER: "OTHER"
} as const;

const RecipeSource = {
  PERSONAL: "PERSONAL",
  FAMILY: "FAMILY",
  WEB: "WEB",
  COOKBOOK: "COOKBOOK",
  FRIEND: "FRIEND"
} as const;

const Complexity = {
  FAMILIAR: "FAMILIAR",
  STRETCH: "STRETCH",
  CHALLENGE: "CHALLENGE"
} as const;

const prisma = new PrismaClient();

async function main() {
  // === TECHNIQUES ===
  const techniques = [
    { name: "sautéing", description: "Cooking quickly in a small amount of fat over high heat", difficulty: 1 },
    { name: "braising", description: "Slow cooking in liquid for tender, flavorful results", difficulty: 3 },
    { name: "roasting", description: "Cooking with dry heat in an oven", difficulty: 2 },
    { name: "emulsification", description: "Combining fat and water-based ingredients into a stable mixture", difficulty: 4 },
    { name: "deglazing", description: "Adding liquid to a hot pan to dissolve flavorful browned bits", difficulty: 2 },
    { name: "knife skills", description: "Efficient, safe cutting techniques", difficulty: 2 },
    { name: "blanching", description: "Brief boiling followed by ice bath to set color and texture", difficulty: 2 },
    { name: "reduction", description: "Concentrating flavors by simmering to evaporate liquid", difficulty: 2 },
    { name: "tempering", description: "Gradually raising temperature of sensitive ingredients", difficulty: 3 },
    { name: "mise en place", description: "Preparing and organizing all ingredients before cooking", difficulty: 1 }
  ];

  for (const t of techniques) {
    await prisma.technique.upsert({
      where: { name: t.name },
      update: { description: t.description, difficulty: t.difficulty },
      create: { ...t, comfort: 0 }
    });
  }

  // === INVENTORY ITEMS ===
  const items = [
    { name: "garlic", category: ItemCategory.PRODUCE, location: ItemLocation.PANTRY, staple: true },
    { name: "onion", category: ItemCategory.PRODUCE, location: ItemLocation.PANTRY, staple: true },
    { name: "canned chickpeas", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true },
    { name: "canned crushed tomatoes", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true },
    { name: "soy sauce", category: ItemCategory.CONDIMENT, location: ItemLocation.PANTRY, staple: true },
    { name: "olive oil", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true },
    { name: "chicken thighs", category: ItemCategory.MEAT, location: ItemLocation.FREEZER, staple: false },
    { name: "salmon fillet", category: ItemCategory.MEAT, location: ItemLocation.FREEZER, staple: false },
    { name: "ground beef", category: ItemCategory.MEAT, location: ItemLocation.FREEZER, staple: false },
    { name: "black pepper", category: ItemCategory.SPICE, location: ItemLocation.PANTRY, staple: true },
    { name: "cumin", category: ItemCategory.SPICE, location: ItemLocation.PANTRY, staple: true },
    { name: "paprika", category: ItemCategory.SPICE, location: ItemLocation.PANTRY, staple: true },
    { name: "oregano", category: ItemCategory.SPICE, location: ItemLocation.PANTRY, staple: true },
    { name: "chili powder", category: ItemCategory.SPICE, location: ItemLocation.PANTRY, staple: true },
    { name: "butter", category: ItemCategory.DAIRY, location: ItemLocation.FRIDGE, staple: true },
    { name: "eggs", category: ItemCategory.DAIRY, location: ItemLocation.FRIDGE, staple: true },
    { name: "parmesan", category: ItemCategory.DAIRY, location: ItemLocation.FRIDGE, staple: false },
    { name: "rice", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true },
    { name: "pasta", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true },
    { name: "chicken broth", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true },
    { name: "lemon", category: ItemCategory.PRODUCE, location: ItemLocation.FRIDGE, staple: false },
    { name: "cilantro", category: ItemCategory.PRODUCE, location: ItemLocation.FRIDGE, staple: false },
    { name: "chipotle peppers in adobo", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: false },
    { name: "dijon mustard", category: ItemCategory.CONDIMENT, location: ItemLocation.FRIDGE, staple: true },
    { name: "honey", category: ItemCategory.PANTRY, location: ItemLocation.PANTRY, staple: true }
  ];

  for (const it of items) {
    const item = await prisma.item.upsert({
      where: { name: it.name },
      update: { category: it.category, location: it.location, staple: it.staple },
      create: it
    });

    const batches = await prisma.itemBatch.findMany({ where: { itemId: item.id } });
    if (batches.length === 0) {
      await prisma.itemBatch.create({
        data: { itemId: item.id, quantityText: "1", purchasedOn: new Date() }
      });
    }
  }

  // === RECIPES ===
  
  // Get technique IDs
  const sauteingTech = await prisma.technique.findUnique({ where: { name: "sautéing" } });
  const braisingTech = await prisma.technique.findUnique({ where: { name: "braising" } });
  const roastingTech = await prisma.technique.findUnique({ where: { name: "roasting" } });
  const deglazingTech = await prisma.technique.findUnique({ where: { name: "deglazing" } });
  const reductionTech = await prisma.technique.findUnique({ where: { name: "reduction" } });

  // Recipe 1: Chicken Tinga Tacos
  await prisma.recipe.upsert({
    where: { title: "Chicken Tinga Tacos" },
    update: {},
    create: {
      title: "Chicken Tinga Tacos",
      servings: 2,
      servingsMax: 8,
      handsOnMin: 25,
      totalMin: 45,
      difficulty: 2,
      source: RecipeSource.WEB,
      sourceRef: "Adapted from Serious Eats",
      cuisine: "Mexican",
      complexity: Complexity.FAMILIAR,
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["WEEKNIGHT", "MEAL_PREP", "CROWD_PLEASER"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Poach chicken thighs in salted water until cooked through, about 20 minutes. Reserve 1 cup cooking liquid. Shred chicken.",
        "Sauté sliced onion in oil until softened, 5-7 minutes. Add minced garlic, cook 1 minute.",
        "Add chipotles (with adobo sauce), crushed tomatoes, oregano, and cumin. Simmer 10 minutes.",
        "Add shredded chicken and reserved poaching liquid. Simmer until sauce clings to chicken, about 10 more minutes.",
        "Season with salt. Serve in warmed corn tortillas with cilantro, diced onion, and lime wedges."
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "chicken thighs", required: true, quantityText: "1.5 lb" },
          { name: "chipotle peppers in adobo", required: true, quantityText: "2-3 peppers + sauce" },
          { name: "onion", required: true, quantityText: "1 medium", preparation: "sliced" },
          { name: "garlic", required: true, quantityText: "4 cloves", preparation: "minced" },
          { name: "canned crushed tomatoes", required: true, quantityText: "14 oz" },
          { name: "oregano", required: true, quantityText: "1 tsp" },
          { name: "cumin", required: true, quantityText: "1 tsp" },
          { name: "cilantro", required: false, quantityText: "1/2 bunch", preparation: "chopped" },
          { name: "corn tortillas", required: true, quantityText: "12" },
          { name: "lime", required: false, quantityText: "2", preparation: "cut into wedges" }
        ]
      },
      techniques: {
        create: [
          { techniqueId: braisingTech!.id },
          { techniqueId: sauteingTech!.id }
        ]
      }
    }
  });

  // Recipe 2: Honey Dijon Salmon
  await prisma.recipe.upsert({
    where: { title: "Honey Dijon Sheet Pan Salmon" },
    update: {},
    create: {
      title: "Honey Dijon Sheet Pan Salmon",
      servings: 2,
      handsOnMin: 10,
      totalMin: 25,
      difficulty: 1,
      source: RecipeSource.PERSONAL,
      cuisine: "American",
      complexity: Complexity.FAMILIAR,
      equipment: JSON.stringify(["OVEN"]),
      tags: JSON.stringify(["WEEKNIGHT", "HEALTHY", "QUICK"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Preheat oven to 425°F. Line a sheet pan with parchment or foil.",
        "Whisk together soy sauce, Dijon mustard, honey, and melted butter.",
        "Place salmon on prepared pan. Season with pepper. Brush glaze over salmon.",
        "Roast 12-14 minutes until salmon flakes easily.",
        "Finish with a squeeze of lemon and fresh herbs if desired."
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "salmon fillet", required: true, quantityText: "1 lb" },
          { name: "soy sauce", required: true, quantityText: "1 tbsp" },
          { name: "dijon mustard", required: true, quantityText: "1 tbsp", substitutions: JSON.stringify(["whole grain mustard"]) },
          { name: "honey", required: true, quantityText: "1 tbsp" },
          { name: "butter", required: true, quantityText: "1 tbsp", preparation: "melted", substitutions: JSON.stringify(["olive oil"]) },
          { name: "black pepper", required: false, quantityText: "to taste" },
          { name: "lemon", required: false, quantityText: "1/2" }
        ]
      },
      techniques: {
        create: [
          { techniqueId: roastingTech!.id }
        ]
      }
    }
  });

  // Recipe 3: Weeknight Pasta with Garlic and Oil
  await prisma.recipe.upsert({
    where: { title: "Aglio e Olio" },
    update: {},
    create: {
      title: "Aglio e Olio",
      servings: 2,
      handsOnMin: 15,
      totalMin: 20,
      difficulty: 2,
      source: RecipeSource.FAMILY,
      sourceRef: "Nonna's recipe",
      cuisine: "Italian",
      complexity: Complexity.FAMILIAR,
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["WEEKNIGHT", "VEGETARIAN", "QUICK", "PANTRY_MEAL"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Bring a large pot of salted water to boil. Cook pasta until al dente, reserving 1 cup pasta water before draining.",
        "While pasta cooks, heat olive oil in a large skillet over medium-low heat. Add sliced garlic and cook gently until golden (not brown!), about 3-4 minutes.",
        "Add red pepper flakes and remove from heat briefly.",
        "Add drained pasta to the skillet with 1/2 cup pasta water. Toss vigorously over medium heat, adding more water as needed until silky.",
        "Finish with parsley, more olive oil, and parmesan if desired."
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "pasta", required: true, quantityText: "8 oz", preparation: "spaghetti or linguine" },
          { name: "olive oil", required: true, quantityText: "1/3 cup" },
          { name: "garlic", required: true, quantityText: "6 cloves", preparation: "thinly sliced" },
          { name: "red pepper flakes", required: false, quantityText: "1/2 tsp" },
          { name: "parsley", required: false, quantityText: "1/4 cup", preparation: "chopped" },
          { name: "parmesan", required: false, quantityText: "for serving" }
        ]
      },
      techniques: {
        create: [
          { techniqueId: sauteingTech!.id }
        ]
      }
    }
  });

  // Recipe 4: Beef and Broccoli (stretch recipe)
  await prisma.recipe.upsert({
    where: { title: "Better Than Takeout Beef and Broccoli" },
    update: {},
    create: {
      title: "Better Than Takeout Beef and Broccoli",
      servings: 4,
      handsOnMin: 25,
      totalMin: 35,
      difficulty: 3,
      source: RecipeSource.WEB,
      sourceRef: "Woks of Life",
      cuisine: "Chinese",
      complexity: Complexity.STRETCH,
      equipment: JSON.stringify(["STOVETOP", "WOK"]),
      tags: JSON.stringify(["WEEKNIGHT", "STIR_FRY"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Slice beef against the grain into thin strips. Marinate with soy sauce, cornstarch, and a splash of oil for 15 min.",
        "Blanch broccoli in boiling water for 1 minute, then shock in ice water. Drain well.",
        "Mix sauce: soy sauce, oyster sauce, sugar, and cornstarch slurry.",
        "Heat wok until smoking. Add oil, then sear beef in batches until browned. Remove.",
        "Add more oil, stir-fry garlic and ginger briefly. Add broccoli and toss.",
        "Return beef, pour in sauce, toss until glossy and thickened. Serve over rice."
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "flank steak", required: true, quantityText: "1 lb", preparation: "sliced thin", substitutions: JSON.stringify(["sirloin", "ground beef"]) },
          { name: "broccoli", required: true, quantityText: "1 lb", preparation: "cut into florets" },
          { name: "soy sauce", required: true, quantityText: "3 tbsp" },
          { name: "oyster sauce", required: true, quantityText: "2 tbsp" },
          { name: "garlic", required: true, quantityText: "3 cloves", preparation: "minced" },
          { name: "ginger", required: true, quantityText: "1 inch", preparation: "minced" },
          { name: "cornstarch", required: true, quantityText: "2 tbsp" },
          { name: "rice", required: false, quantityText: "for serving" }
        ]
      },
      techniques: {
        create: [
          { techniqueId: sauteingTech!.id }
        ]
      }
    }
  });

  console.log("Seed complete with enhanced data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
