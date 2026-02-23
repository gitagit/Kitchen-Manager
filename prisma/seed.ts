import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ============ TECHNIQUES ============
  const techniqueData = [
    { name: "sautéing",       description: "Cooking quickly in a small amount of fat over high heat",                              difficulty: 1, comfort: 3 },
    { name: "braising",       description: "Slow cooking in liquid for tender, flavorful results",                                 difficulty: 3, comfort: 1 },
    { name: "roasting",       description: "Cooking with dry heat in an oven",                                                     difficulty: 2, comfort: 2 },
    { name: "emulsification", description: "Combining fat and water-based ingredients into a stable mixture",                      difficulty: 4, comfort: 0 },
    { name: "deglazing",      description: "Adding liquid to a hot pan to dissolve flavorful browned bits",                       difficulty: 2, comfort: 1 },
    { name: "knife skills",   description: "Efficient, safe cutting techniques for prep work",                                     difficulty: 2, comfort: 3 },
    { name: "blanching",      description: "Brief boiling followed by ice bath to set color and texture",                         difficulty: 2, comfort: 1 },
    { name: "reduction",      description: "Concentrating flavors by simmering to evaporate liquid",                              difficulty: 2, comfort: 2 },
    { name: "tempering",      description: "Gradually raising temperature of sensitive ingredients to prevent curdling or seizing", difficulty: 3, comfort: 0 },
    { name: "mise en place",  description: "Preparing and organizing all ingredients before cooking begins",                       difficulty: 1, comfort: 3 },
    { name: "whisking",       description: "Rapidly beating ingredients to incorporate air or combine thoroughly",                 difficulty: 1, comfort: 2 },
    { name: "caramelizing",   description: "Cooking sugars or onions over low heat until deeply browned and sweet",               difficulty: 3, comfort: 1 },
    { name: "marinating",     description: "Soaking protein or vegetables in seasoned liquid to add flavor and tenderize",        difficulty: 1, comfort: 2 },
    { name: "folding",        description: "Gently combining batter ingredients to preserve air without deflating",               difficulty: 2, comfort: 1 },
  ];

  for (const t of techniqueData) {
    await prisma.technique.upsert({
      where: { name: t.name },
      update: { description: t.description, difficulty: t.difficulty, comfort: t.comfort },
      create: t,
    });
  }

  // Build a map of technique name → record (for recipe linking)
  const tech: Record<string, { id: string }> = {};
  for (const t of techniqueData) {
    tech[t.name] = (await prisma.technique.findUnique({ where: { name: t.name } }))!;
  }

  // ============ INVENTORY ============
  const itemsData: Array<{
    name: string;
    category: string;
    location: string;
    staple?: boolean;
    notes?: string;
    defaultCostCents?: number;
    batch: {
      quantityText: string;
      expiresOn?: Date;
      purchasedOn?: Date;
      costCents?: number;
    };
  }> = [
    // ---- OILS & ACIDS ----
    {
      name: "olive oil", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 899,
      batch: { quantityText: "1 bottle (~500ml), ~half full", purchasedOn: new Date("2026-01-15"), costCents: 1099 },
    },
    {
      name: "vegetable oil", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 499,
      batch: { quantityText: "1 bottle (32oz)", purchasedOn: new Date("2025-12-01"), costCents: 499 },
    },
    {
      name: "sesame oil", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 499,
      batch: { quantityText: "1 bottle (8oz), toasted", costCents: 599 },
    },
    {
      name: "rice vinegar", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 279,
      batch: { quantityText: "1 bottle (12oz)" },
    },
    {
      name: "apple cider vinegar", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 bottle (16oz)" },
    },
    {
      name: "balsamic vinegar", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 499,
      batch: { quantityText: "1 bottle (8.5oz)" },
    },

    // ---- CONDIMENTS ----
    {
      name: "soy sauce", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 349,
      batch: { quantityText: "1 bottle (low sodium, 15oz)", expiresOn: new Date("2027-12-01"), costCents: 349 },
    },
    {
      name: "fish sauce", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 599,
      batch: { quantityText: "1 bottle (Red Boat, 8.45oz)" },
    },
    {
      name: "oyster sauce", category: "CONDIMENT", location: "PANTRY", staple: false, defaultCostCents: 349,
      batch: { quantityText: "1 bottle (9oz)", costCents: 349 },
    },
    {
      name: "hot sauce", category: "CONDIMENT", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 bottle (Frank's RedHot, 12oz)" },
    },
    {
      name: "dijon mustard", category: "CONDIMENT", location: "FRIDGE", staple: true, defaultCostCents: 349,
      batch: { quantityText: "1 jar (8oz)", expiresOn: new Date("2027-06-01"), costCents: 349 },
    },
    {
      name: "tahini", category: "CONDIMENT", location: "PANTRY", staple: false, defaultCostCents: 699,
      batch: { quantityText: "1 jar (16oz)" },
    },

    // ---- SWEET ----
    {
      name: "honey", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 599,
      batch: { quantityText: "1 jar (~12oz), ~3/4 full" },
    },
    {
      name: "maple syrup", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 899,
      batch: { quantityText: "1 bottle (8.5oz)", costCents: 999 },
    },

    // ---- GRAINS & CANNED ----
    {
      name: "jasmine rice", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 699,
      batch: { quantityText: "5 lb bag, ~3 lb remaining", purchasedOn: new Date("2026-01-01") },
    },
    {
      name: "spaghetti", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 199,
      batch: { quantityText: "1 lb box", expiresOn: new Date("2027-06-01"), costCents: 199 },
    },
    {
      name: "penne", category: "PANTRY", location: "PANTRY", staple: false, defaultCostCents: 199,
      batch: { quantityText: "1 lb box", expiresOn: new Date("2027-08-01"), costCents: 199 },
    },
    {
      name: "canned chickpeas", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 149,
      batch: { quantityText: "2 cans (15oz each)", expiresOn: new Date("2028-01-01"), costCents: 299 },
    },
    {
      name: "canned crushed tomatoes", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 can (28oz)", expiresOn: new Date("2027-09-01"), costCents: 249 },
    },
    {
      name: "canned black beans", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 149,
      batch: { quantityText: "2 cans (15oz each)", expiresOn: new Date("2027-11-01"), costCents: 299 },
    },
    {
      name: "canned coconut milk", category: "PANTRY", location: "PANTRY", staple: false, defaultCostCents: 199,
      batch: { quantityText: "2 cans (13.5oz each)", expiresOn: new Date("2027-06-01"), costCents: 399 },
    },
    {
      name: "chicken broth", category: "PANTRY", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 carton (32oz)", expiresOn: new Date("2026-05-15"), costCents: 299 },
    },
    {
      name: "chipotle peppers in adobo", category: "PANTRY", location: "PANTRY", staple: false, defaultCostCents: 199,
      batch: { quantityText: "1 can (7oz)", expiresOn: new Date("2027-01-01"), costCents: 199 },
    },

    // ---- BAKING ----
    {
      name: "all-purpose flour", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 399,
      batch: { quantityText: "5 lb bag, ~3 lb remaining", purchasedOn: new Date("2025-11-01") },
    },
    {
      name: "granulated sugar", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "4 lb bag, ~2 lb remaining" },
    },
    {
      name: "brown sugar", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 199,
      batch: { quantityText: "1 lb bag, ~half used" },
    },
    {
      name: "cornstarch", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 199,
      batch: { quantityText: "1 lb box" },
    },
    {
      name: "baking powder", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 199,
      batch: { quantityText: "8oz can", expiresOn: new Date("2027-03-01"), costCents: 199 },
    },
    {
      name: "baking soda", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 99,
      batch: { quantityText: "1 lb box" },
    },
    {
      name: "pure vanilla extract", category: "BAKING", location: "PANTRY", staple: true, defaultCostCents: 799,
      batch: { quantityText: "2oz bottle", costCents: 999 },
    },
    {
      name: "panko breadcrumbs", category: "BAKING", location: "PANTRY", staple: false, defaultCostCents: 299,
      batch: { quantityText: "8oz box", expiresOn: new Date("2027-01-01"), costCents: 299 },
    },

    // ---- SPICES ----
    {
      name: "kosher salt", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "large box (48oz), plenty left" },
    },
    {
      name: "black pepper", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 349,
      batch: { quantityText: "1 jar (4oz, whole peppercorns + grinder)" },
    },
    {
      name: "cumin", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 jar (2oz)" },
    },
    {
      name: "smoked paprika", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 jar (2oz)" },
    },
    {
      name: "chili powder", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (2.5oz)" },
    },
    {
      name: "cayenne pepper", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (1.5oz)" },
    },
    {
      name: "ground coriander", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 jar (2oz)" },
    },
    {
      name: "turmeric", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 jar (2oz)" },
    },
    {
      name: "garam masala", category: "SPICE", location: "PANTRY", staple: false, defaultCostCents: 349,
      batch: { quantityText: "1 jar (2oz)" },
    },
    {
      name: "dried oregano", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (0.75oz)" },
    },
    {
      name: "dried thyme", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (0.65oz)" },
    },
    {
      name: "bay leaves", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 299,
      batch: { quantityText: "1 jar" },
    },
    {
      name: "ground cinnamon", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (2oz)" },
    },
    {
      name: "garlic powder", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (3oz)" },
    },
    {
      name: "onion powder", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (3oz)" },
    },
    {
      name: "red pepper flakes", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (1.5oz)" },
    },
    {
      name: "Italian seasoning", category: "SPICE", location: "PANTRY", staple: true, defaultCostCents: 249,
      batch: { quantityText: "1 jar (0.75oz)" },
    },

    // ---- FRESH PRODUCE ----
    {
      name: "garlic", category: "PRODUCE", location: "PANTRY", staple: true,
      batch: { quantityText: "2 heads", expiresOn: new Date("2026-03-10") },
    },
    {
      name: "yellow onion", category: "PRODUCE", location: "PANTRY", staple: true,
      batch: { quantityText: "3 medium onions", expiresOn: new Date("2026-03-20") },
    },
    {
      name: "ginger", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "1 large knob (~4 inches)", expiresOn: new Date("2026-03-05"), purchasedOn: new Date("2026-02-10") },
    },
    {
      name: "lemon", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "4 lemons", expiresOn: new Date("2026-03-07"), purchasedOn: new Date("2026-02-17") },
    },
    {
      name: "lime", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "3 limes", expiresOn: new Date("2026-03-07"), purchasedOn: new Date("2026-02-17") },
    },
    {
      name: "red bell pepper", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "2 peppers", expiresOn: new Date("2026-03-01"), purchasedOn: new Date("2026-02-17") },
    },
    {
      name: "jalapeño", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "3 peppers", expiresOn: new Date("2026-03-03") },
    },
    {
      name: "cilantro", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "1 bunch", expiresOn: new Date("2026-02-27"), purchasedOn: new Date("2026-02-20") },
    },
    {
      name: "fresh parsley", category: "PRODUCE", location: "FRIDGE", staple: false,
      batch: { quantityText: "1 bunch", expiresOn: new Date("2026-03-02"), purchasedOn: new Date("2026-02-18") },
    },
    {
      name: "ripe bananas", category: "PRODUCE", location: "COUNTER", staple: false,
      notes: "Very ripe — perfect for banana bread",
      batch: { quantityText: "4 bananas, heavily spotted", expiresOn: new Date("2026-02-26") },
    },
    {
      name: "shallots", category: "PRODUCE", location: "PANTRY", staple: false,
      batch: { quantityText: "3 shallots", expiresOn: new Date("2026-03-15") },
    },

    // ---- DAIRY ----
    {
      name: "eggs", category: "DAIRY", location: "FRIDGE", staple: true, defaultCostCents: 499,
      batch: { quantityText: "1 dozen, ~10 remaining", expiresOn: new Date("2026-03-15"), purchasedOn: new Date("2026-02-10"), costCents: 499 },
    },
    {
      name: "unsalted butter", category: "DAIRY", location: "FRIDGE", staple: true, defaultCostCents: 399,
      batch: { quantityText: "2 sticks (1/2 lb)", expiresOn: new Date("2026-04-01"), costCents: 399 },
    },
    {
      name: "heavy cream", category: "DAIRY", location: "FRIDGE", staple: false, defaultCostCents: 399,
      batch: { quantityText: "1 cup (1/2 pint)", expiresOn: new Date("2026-03-01"), purchasedOn: new Date("2026-02-15"), costCents: 399 },
    },
    {
      name: "parmesan", category: "DAIRY", location: "FRIDGE", staple: false, defaultCostCents: 599,
      batch: { quantityText: "wedge, ~4oz", expiresOn: new Date("2026-03-15"), costCents: 699 },
    },
    {
      name: "feta", category: "DAIRY", location: "FRIDGE", staple: false, defaultCostCents: 399,
      batch: { quantityText: "4oz block in brine", expiresOn: new Date("2026-03-10"), purchasedOn: new Date("2026-02-14"), costCents: 399 },
    },
    {
      name: "plain Greek yogurt", category: "DAIRY", location: "FRIDGE", staple: false, defaultCostCents: 599,
      batch: { quantityText: "32oz container, ~half remaining", expiresOn: new Date("2026-03-07"), purchasedOn: new Date("2026-02-10"), costCents: 599 },
    },
    {
      name: "cheddar", category: "DAIRY", location: "FRIDGE", staple: false, defaultCostCents: 499,
      batch: { quantityText: "8oz block", expiresOn: new Date("2026-04-01"), costCents: 499 },
    },
    {
      name: "whole milk", category: "DAIRY", location: "FRIDGE", staple: false, defaultCostCents: 349,
      // Expiring tomorrow — will trigger expiring-soon bonus for recipes that use milk
      batch: { quantityText: "1/2 gallon", expiresOn: new Date("2026-02-28"), purchasedOn: new Date("2026-02-17"), costCents: 299 },
    },

    // ---- MEAT & PROTEIN ----
    {
      name: "chicken thighs", category: "MEAT", location: "FREEZER", staple: false, defaultCostCents: 699,
      batch: { quantityText: "2 lb pack, bone-in skin-on", expiresOn: new Date("2026-06-01"), purchasedOn: new Date("2026-02-01"), costCents: 799 },
    },
    {
      name: "salmon fillet", category: "MEAT", location: "FREEZER", staple: false, defaultCostCents: 1299,
      batch: { quantityText: "2 fillets (~1 lb total)", expiresOn: new Date("2026-05-01"), purchasedOn: new Date("2026-02-08"), costCents: 1499 },
    },
    {
      name: "ground beef", category: "MEAT", location: "FREEZER", staple: false, defaultCostCents: 699,
      notes: "85/15",
      batch: { quantityText: "1 lb", expiresOn: new Date("2026-04-15"), purchasedOn: new Date("2026-02-08"), costCents: 699 },
    },
    {
      name: "shrimp", category: "MEAT", location: "FREEZER", staple: false, defaultCostCents: 999,
      notes: "Peeled & deveined, 21-25ct",
      batch: { quantityText: "1 lb bag (frozen)", expiresOn: new Date("2026-07-01"), purchasedOn: new Date("2026-01-15"), costCents: 1099 },
    },

    // ---- FROZEN ----
    {
      name: "frozen peas", category: "FROZEN", location: "FREEZER", staple: true, defaultCostCents: 199,
      batch: { quantityText: "1 lb bag", expiresOn: new Date("2026-12-01"), costCents: 199 },
    },
    {
      name: "shelled edamame", category: "FROZEN", location: "FREEZER", staple: false, defaultCostCents: 349,
      batch: { quantityText: "1 lb bag", expiresOn: new Date("2026-09-01"), costCents: 349 },
    },
  ];

  for (const { name, category, location, staple, notes, defaultCostCents, batch } of itemsData) {
    const item = await prisma.item.upsert({
      where: { name },
      update: { category, location, staple: staple ?? false, notes, defaultCostCents },
      create: { name, category, location, staple: staple ?? false, notes, defaultCostCents },
    });
    const existing = await prisma.itemBatch.findMany({ where: { itemId: item.id } });
    if (existing.length === 0) {
      await prisma.itemBatch.create({ data: { itemId: item.id, ...batch } });
    }
  }

  // ============ RECIPES ============

  const chickTinga = await prisma.recipe.upsert({
    where: { title: "Chicken Tinga Tacos" },
    update: {},
    create: {
      title: "Chicken Tinga Tacos",
      servings: 2, servingsMax: 8,
      handsOnMin: 25, totalMin: 45,
      difficulty: 2,
      source: "WEB", sourceRef: "Adapted from Serious Eats",
      cuisine: "Mexican",
      complexity: "FAMILIAR",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["WEEKNIGHT", "MEAL_PREP", "CROWD_PLEASER"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Poach chicken thighs in salted water until cooked through, about 20 minutes. Reserve 1 cup cooking liquid. Shred chicken.",
        "Sauté sliced onion in oil until softened, 5–7 minutes. Add minced garlic, cook 1 minute.",
        "Add chipotles (with adobo sauce), crushed tomatoes, oregano, and cumin. Simmer 10 minutes.",
        "Add shredded chicken and reserved poaching liquid. Simmer until sauce clings to chicken, about 10 more minutes.",
        "Season with salt. Serve in warmed corn tortillas with cilantro, diced onion, and lime wedges.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "chicken thighs",              required: true,  quantityText: "1.5 lb" },
          { name: "chipotle peppers in adobo",   required: true,  quantityText: "2–3 peppers + sauce" },
          { name: "yellow onion",                required: true,  quantityText: "1 medium",   preparation: "sliced" },
          { name: "garlic",                      required: true,  quantityText: "4 cloves",   preparation: "minced" },
          { name: "canned crushed tomatoes",     required: true,  quantityText: "14 oz" },
          { name: "dried oregano",               required: true,  quantityText: "1 tsp" },
          { name: "cumin",                       required: true,  quantityText: "1 tsp" },
          { name: "cilantro",                    required: false, quantityText: "1/2 bunch",  preparation: "chopped" },
          { name: "corn tortillas",              required: true,  quantityText: "12" },
          { name: "lime",                        required: false, quantityText: "2",          preparation: "cut into wedges" },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["braising"].id },
          { techniqueId: tech["sautéing"].id },
        ],
      },
    },
  });

  const honeyDijon = await prisma.recipe.upsert({
    where: { title: "Honey Dijon Sheet Pan Salmon" },
    update: {},
    create: {
      title: "Honey Dijon Sheet Pan Salmon",
      servings: 2,
      handsOnMin: 10, totalMin: 25,
      difficulty: 1,
      source: "PERSONAL",
      cuisine: "American",
      complexity: "FAMILIAR",
      equipment: JSON.stringify(["OVEN"]),
      tags: JSON.stringify(["WEEKNIGHT", "HEALTHY", "QUICK"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Preheat oven to 425°F. Line a sheet pan with parchment or foil.",
        "Whisk together soy sauce, Dijon mustard, honey, and melted butter.",
        "Place salmon on prepared pan. Season with black pepper. Brush glaze generously over salmon.",
        "Roast 12–14 minutes until salmon flakes easily with a fork.",
        "Finish with a squeeze of lemon and fresh herbs if desired.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "salmon fillet",  required: true,  quantityText: "1 lb" },
          { name: "soy sauce",      required: true,  quantityText: "1 tbsp" },
          { name: "dijon mustard",  required: true,  quantityText: "1 tbsp", substitutions: JSON.stringify(["whole grain mustard"]) },
          { name: "honey",          required: true,  quantityText: "1 tbsp" },
          { name: "unsalted butter",required: true,  quantityText: "1 tbsp", preparation: "melted", substitutions: JSON.stringify(["olive oil"]) },
          { name: "black pepper",   required: false, quantityText: "to taste" },
          { name: "lemon",          required: false, quantityText: "1/2" },
        ],
      },
      techniques: {
        create: [{ techniqueId: tech["roasting"].id }],
      },
    },
  });

  const aglioEOlio = await prisma.recipe.upsert({
    where: { title: "Aglio e Olio" },
    update: {},
    create: {
      title: "Aglio e Olio",
      servings: 2,
      handsOnMin: 15, totalMin: 20,
      difficulty: 2,
      source: "FAMILY", sourceRef: "Nonna's recipe",
      cuisine: "Italian",
      complexity: "FAMILIAR",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["WEEKNIGHT", "VEGETARIAN", "QUICK", "PANTRY_MEAL"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Bring a large pot of well-salted water to boil. Cook pasta until al dente, reserving 1 cup pasta water before draining.",
        "While pasta cooks, heat olive oil in a large skillet over medium-low heat. Add sliced garlic and cook gently until golden (not brown!), about 3–4 minutes.",
        "Add red pepper flakes and remove from heat briefly.",
        "Add drained pasta to the skillet with 1/2 cup pasta water. Toss vigorously over medium heat, adding more water as needed until silky.",
        "Finish with chopped parsley, a drizzle more olive oil, and parmesan.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "spaghetti",      required: true,  quantityText: "8 oz",      preparation: "spaghetti or linguine" },
          { name: "olive oil",      required: true,  quantityText: "1/3 cup" },
          { name: "garlic",         required: true,  quantityText: "6 cloves",   preparation: "thinly sliced" },
          { name: "red pepper flakes", required: false, quantityText: "1/2 tsp" },
          { name: "fresh parsley",  required: false, quantityText: "1/4 cup",   preparation: "chopped" },
          { name: "parmesan",       required: false, quantityText: "for serving" },
        ],
      },
      techniques: {
        create: [{ techniqueId: tech["sautéing"].id }],
      },
    },
  });

  const beefBroccoli = await prisma.recipe.upsert({
    where: { title: "Better Than Takeout Beef and Broccoli" },
    update: {},
    create: {
      title: "Better Than Takeout Beef and Broccoli",
      servings: 4,
      handsOnMin: 25, totalMin: 35,
      difficulty: 3,
      source: "WEB", sourceRef: "Woks of Life",
      cuisine: "Chinese",
      complexity: "STRETCH",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["WEEKNIGHT", "MEAL_PREP"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Slice beef against the grain into thin strips. Marinate with soy sauce, cornstarch, and a splash of oil for 15 min.",
        "Blanch broccoli in boiling water for 1 minute, then shock in ice water. Drain well.",
        "Mix sauce: soy sauce, oyster sauce, a pinch of sugar, and a cornstarch slurry.",
        "Heat a large skillet until very hot. Add oil, then sear beef in batches until browned. Remove and set aside.",
        "Add more oil, stir-fry garlic and ginger briefly. Add broccoli and toss to coat.",
        "Return beef, pour in sauce, toss until glossy and thickened. Serve over jasmine rice.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "flank steak",    required: true,  quantityText: "1 lb",      preparation: "sliced thin", substitutions: JSON.stringify(["sirloin", "ground beef"]) },
          { name: "broccoli",       required: true,  quantityText: "1 lb",      preparation: "cut into florets" },
          { name: "soy sauce",      required: true,  quantityText: "3 tbsp" },
          { name: "oyster sauce",   required: true,  quantityText: "2 tbsp" },
          { name: "garlic",         required: true,  quantityText: "3 cloves",   preparation: "minced" },
          { name: "ginger",         required: true,  quantityText: "1 inch",     preparation: "minced" },
          { name: "cornstarch",     required: true,  quantityText: "2 tbsp" },
          { name: "sesame oil",     required: false, quantityText: "1 tsp" },
          { name: "jasmine rice",   required: false, quantityText: "for serving" },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["sautéing"].id },
          { techniqueId: tech["blanching"].id },
          { techniqueId: tech["marinating"].id },
        ],
      },
    },
  });

  const shakshuka = await prisma.recipe.upsert({
    where: { title: "Shakshuka" },
    update: {},
    create: {
      title: "Shakshuka",
      servings: 2, servingsMax: 4,
      handsOnMin: 15, totalMin: 30,
      difficulty: 2,
      source: "WEB", sourceRef: "Inspired by Yotam Ottolenghi",
      cuisine: "Israeli",
      complexity: "FAMILIAR",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["VEGETARIAN", "WEEKNIGHT", "BREAKFAST"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Heat olive oil in a large skillet over medium heat. Add diced onion and cook until softened, about 7 minutes.",
        "Add garlic, cumin, and smoked paprika. Cook 1 minute until fragrant.",
        "Add crushed tomatoes, season with salt, and simmer 10 minutes until sauce thickens slightly.",
        "Use a spoon to make wells in the sauce. Crack an egg into each well. Cover and cook 5–7 minutes until whites are set but yolks are still runny.",
        "Top with crumbled feta, fresh parsley, and a pinch of red pepper flakes. Serve straight from the pan with crusty bread.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "eggs",                    required: true,  quantityText: "4" },
          { name: "canned crushed tomatoes", required: true,  quantityText: "28 oz can" },
          { name: "yellow onion",            required: true,  quantityText: "1 medium",   preparation: "diced" },
          { name: "garlic",                  required: true,  quantityText: "4 cloves",   preparation: "minced" },
          { name: "olive oil",               required: true,  quantityText: "2 tbsp" },
          { name: "cumin",                   required: true,  quantityText: "1 tsp" },
          { name: "smoked paprika",          required: true,  quantityText: "1 tsp" },
          { name: "red pepper flakes",       required: false, quantityText: "1/4 tsp" },
          { name: "feta",                    required: false, quantityText: "2 oz",       preparation: "crumbled" },
          { name: "fresh parsley",           required: false, quantityText: "small handful", preparation: "chopped" },
          { name: "crusty bread",            required: false, quantityText: "for serving" },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["sautéing"].id },
          { techniqueId: tech["reduction"].id },
        ],
      },
    },
  });

  const tikka = await prisma.recipe.upsert({
    where: { title: "Chicken Tikka Masala" },
    update: {},
    create: {
      title: "Chicken Tikka Masala",
      servings: 4,
      handsOnMin: 30, totalMin: 60,
      difficulty: 3,
      source: "WEB", sourceRef: "Adapted from Serious Eats",
      cuisine: "Indian",
      complexity: "STRETCH",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["MEAL_PREP", "CROWD_PLEASER"]),
      seasons: JSON.stringify(["FALL", "WINTER"]),
      instructions: [
        "Marinate: combine boneless chicken thighs with yogurt, 1 tsp garam masala, 1/2 tsp turmeric, salt, and lemon juice. Refrigerate at least 1 hour (or overnight).",
        "Sear chicken: heat oil in a large skillet or Dutch oven over high heat. Cook chicken until charred in spots, about 3–4 minutes per side. Remove and roughly chop.",
        "In the same pan over medium heat, cook diced onion in butter until deeply golden, about 15 minutes. Add garlic and ginger, cook 2 minutes.",
        "Add remaining garam masala, cumin, ground coriander, turmeric, and smoked paprika. Stir and cook 1 minute.",
        "Add crushed tomatoes and simmer 10 minutes. Stir in heavy cream (or coconut milk). Add chicken back in.",
        "Simmer until sauce is thick and chicken is cooked through, about 10 minutes. Serve over jasmine rice with cilantro.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "chicken thighs",          required: true,  quantityText: "1.5 lb", preparation: "boneless, skinless" },
          { name: "plain Greek yogurt",       required: true,  quantityText: "1/2 cup", preparation: "for marinade" },
          { name: "heavy cream",             required: true,  quantityText: "1/2 cup", substitutions: JSON.stringify(["canned coconut milk"]) },
          { name: "canned crushed tomatoes", required: true,  quantityText: "14 oz" },
          { name: "yellow onion",            required: true,  quantityText: "1 large",  preparation: "diced" },
          { name: "garlic",                  required: true,  quantityText: "5 cloves", preparation: "minced" },
          { name: "ginger",                  required: true,  quantityText: "1.5 inch", preparation: "grated" },
          { name: "garam masala",            required: true,  quantityText: "2 tsp" },
          { name: "turmeric",                required: true,  quantityText: "1 tsp" },
          { name: "cumin",                   required: true,  quantityText: "1 tsp" },
          { name: "ground coriander",        required: true,  quantityText: "1 tsp" },
          { name: "smoked paprika",          required: true,  quantityText: "1 tsp" },
          { name: "unsalted butter",         required: true,  quantityText: "2 tbsp" },
          { name: "lemon",                   required: false, quantityText: "1/2", preparation: "juiced" },
          { name: "jasmine rice",            required: false, quantityText: "for serving" },
          { name: "cilantro",                required: false, quantityText: "for garnish" },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["sautéing"].id },
          { techniqueId: tech["marinating"].id },
          { techniqueId: tech["reduction"].id },
        ],
      },
    },
  });

  const shrimpPasta = await prisma.recipe.upsert({
    where: { title: "Garlic Butter Shrimp Pasta" },
    update: {},
    create: {
      title: "Garlic Butter Shrimp Pasta",
      servings: 2,
      handsOnMin: 10, totalMin: 20,
      difficulty: 2,
      source: "PERSONAL",
      cuisine: "Italian",
      complexity: "FAMILIAR",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["WEEKNIGHT", "QUICK", "SEAFOOD"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Bring a large pot of salted water to boil. Cook spaghetti until al dente, reserving 1 cup pasta water.",
        "While pasta cooks, pat shrimp dry and season with salt and red pepper flakes.",
        "Melt butter with a splash of olive oil in a large skillet over medium-high heat. Add shrimp and sear until pink, about 1–2 minutes per side. Remove shrimp.",
        "In the same pan, add minced garlic and cook 30 seconds. Deglaze with lemon juice and a splash of pasta water.",
        "Toss in drained pasta and shrimp. Add more pasta water to loosen. Finish with parsley and parmesan.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "shrimp",          required: true,  quantityText: "1 lb" },
          { name: "spaghetti",       required: true,  quantityText: "8 oz" },
          { name: "garlic",          required: true,  quantityText: "5 cloves",   preparation: "minced" },
          { name: "unsalted butter", required: true,  quantityText: "3 tbsp" },
          { name: "olive oil",       required: true,  quantityText: "1 tbsp" },
          { name: "lemon",           required: true,  quantityText: "1",          preparation: "juiced" },
          { name: "fresh parsley",   required: true,  quantityText: "1/4 cup",    preparation: "chopped" },
          { name: "red pepper flakes", required: false, quantityText: "1/2 tsp" },
          { name: "parmesan",        required: false, quantityText: "for serving" },
          { name: "dry white wine",  required: false, quantityText: "1/4 cup",    preparation: "for deglazing", substitutions: JSON.stringify(["chicken broth", "pasta water"]) },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["sautéing"].id },
          { techniqueId: tech["deglazing"].id },
        ],
      },
    },
  });

  const buddhabowl = await prisma.recipe.upsert({
    where: { title: "Sheet Pan Chickpea Buddha Bowl" },
    update: {},
    create: {
      title: "Sheet Pan Chickpea Buddha Bowl",
      servings: 2, servingsMax: 4,
      handsOnMin: 15, totalMin: 40,
      difficulty: 1,
      source: "PERSONAL",
      cuisine: "Mediterranean",
      complexity: "FAMILIAR",
      equipment: JSON.stringify(["OVEN"]),
      tags: JSON.stringify(["VEGETARIAN", "WEEKNIGHT", "HEALTHY", "MEAL_PREP"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Preheat oven to 425°F. Drain and rinse chickpeas; pat very dry with a paper towel.",
        "Toss chickpeas and sliced bell pepper with olive oil, cumin, smoked paprika, garlic powder, salt, and pepper on a sheet pan. Roast 25–30 minutes, shaking halfway, until chickpeas are crispy.",
        "Meanwhile, cook jasmine rice per package directions.",
        "Make tahini sauce: whisk together tahini, lemon juice, minced garlic, and enough cold water to reach a drizzleable consistency. Season with salt.",
        "Build bowls: rice, roasted chickpeas and peppers, a generous drizzle of tahini sauce. Add any extras you have on hand (cucumber, red onion, herbs).",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "canned chickpeas",   required: true,  quantityText: "15 oz can", preparation: "drained, rinsed, and dried" },
          { name: "red bell pepper",    required: true,  quantityText: "1",          preparation: "sliced" },
          { name: "olive oil",          required: true,  quantityText: "3 tbsp" },
          { name: "cumin",              required: true,  quantityText: "1 tsp" },
          { name: "smoked paprika",     required: true,  quantityText: "1 tsp" },
          { name: "garlic powder",      required: true,  quantityText: "1/2 tsp" },
          { name: "jasmine rice",       required: true,  quantityText: "1 cup dry" },
          { name: "tahini",             required: true,  quantityText: "3 tbsp" },
          { name: "lemon",              required: true,  quantityText: "1",          preparation: "juiced" },
          { name: "garlic",             required: true,  quantityText: "1 clove",    preparation: "minced (for sauce)" },
          { name: "red pepper flakes",  required: false, quantityText: "pinch" },
        ],
      },
      techniques: {
        create: [{ techniqueId: tech["roasting"].id }],
      },
    },
  });

  const bananaBread = await prisma.recipe.upsert({
    where: { title: "Classic Banana Bread" },
    update: {},
    create: {
      title: "Classic Banana Bread",
      servings: 8,
      handsOnMin: 15, totalMin: 75,
      difficulty: 2,
      source: "FAMILY", sourceRef: "Grandma's recipe",
      cuisine: "American",
      complexity: "STRETCH",
      equipment: JSON.stringify(["OVEN"]),
      tags: JSON.stringify(["BAKING", "SWEET", "BREAKFAST"]),
      seasons: JSON.stringify(["FALL", "WINTER"]),
      instructions: [
        "Preheat oven to 350°F. Grease a 9×5-inch loaf pan.",
        "Mash ripe bananas thoroughly in a large bowl — the riper and spottier, the sweeter.",
        "Whisk in melted butter, sugar, eggs, and vanilla extract until combined.",
        "In a separate bowl, whisk flour, baking soda, cinnamon, and salt.",
        "Fold dry ingredients into wet ingredients until just combined — do not overmix; lumps are fine.",
        "Pour into prepared pan. Bake 60–65 minutes until a toothpick inserted in the center comes out clean.",
        "Cool in pan 10 minutes, then turn out onto a rack.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "ripe bananas",     required: true,  quantityText: "3 large",   preparation: "very ripe and mashed" },
          { name: "all-purpose flour",required: true,  quantityText: "1.5 cups" },
          { name: "granulated sugar", required: true,  quantityText: "3/4 cup" },
          { name: "eggs",             required: true,  quantityText: "2" },
          { name: "unsalted butter",  required: true,  quantityText: "1/2 cup",   preparation: "melted and cooled" },
          { name: "baking soda",      required: true,  quantityText: "1 tsp" },
          { name: "pure vanilla extract", required: true, quantityText: "1 tsp" },
          { name: "ground cinnamon",  required: true,  quantityText: "1/2 tsp" },
          { name: "kosher salt",      required: true,  quantityText: "1/4 tsp" },
          { name: "walnuts",          required: false, quantityText: "1/2 cup",   preparation: "roughly chopped" },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["whisking"].id },
          { techniqueId: tech["folding"].id },
        ],
      },
    },
  });

  const frenchOmelette = await prisma.recipe.upsert({
    where: { title: "Classic French Omelette" },
    update: {},
    create: {
      title: "Classic French Omelette",
      servings: 1,
      handsOnMin: 5, totalMin: 5,
      difficulty: 4,
      source: "COOKBOOK", sourceRef: "Jacques Pépin: New Complete Techniques",
      cuisine: "French",
      complexity: "CHALLENGE",
      equipment: JSON.stringify(["STOVETOP"]),
      tags: JSON.stringify(["BREAKFAST", "QUICK", "VEGETARIAN", "TECHNIQUE"]),
      seasons: JSON.stringify([]),
      instructions: [
        "Crack eggs into a bowl. Season with a pinch of salt. Beat vigorously with a fork until completely homogeneous with no streaks of white — about 30 seconds.",
        "Heat a small (8-inch) nonstick or well-seasoned carbon steel pan over medium-high heat. Add butter and swirl until foam subsides.",
        "Pour in eggs. Immediately begin shaking the pan while stirring with a fork held flat. Keep the eggs moving constantly.",
        "As curds form and the bottom sets, tilt the pan and use the fork to roll the omelette toward the far edge.",
        "Tip the pan over your plate so the omelette rolls and folds seam-side down. It should be pale yellow, smooth, and barely set inside.",
        "Optional: stuff with crumbled feta or a pinch of fresh herbs before the final fold.",
      ].join("\n\n"),
      ingredients: {
        create: [
          { name: "eggs",           required: true,  quantityText: "3" },
          { name: "unsalted butter",required: true,  quantityText: "1.5 tbsp" },
          { name: "kosher salt",    required: true,  quantityText: "pinch" },
          { name: "feta",           required: false, quantityText: "1 oz",    preparation: "crumbled" },
          { name: "fresh parsley",  required: false, quantityText: "1 tsp",   preparation: "finely chopped" },
        ],
      },
      techniques: {
        create: [
          { techniqueId: tech["whisking"].id },
          { techniqueId: tech["sautéing"].id },
        ],
      },
    },
  });

  // ============ COOK LOGS ============
  // Simulate cooking history — only insert if none exist for that recipe
  const cookLogData = [
    {
      recipeId: chickTinga.id,
      cookedOn: new Date("2026-02-09"),
      rating: 5,
      notes: "Made a double batch — froze half for meal prep. The chipotle heat was perfect.",
      wouldRepeat: true,
      servedTo: 4,
    },
    {
      recipeId: aglioEOlio.id,
      cookedOn: new Date("2026-02-02"),
      rating: 4,
      notes: "Simple and satisfying weeknight dinner. Used spaghetti instead of linguine.",
      wouldRepeat: true,
      servedTo: 2,
    },
    {
      recipeId: honeyDijon.id,
      cookedOn: new Date("2026-01-24"),
      rating: 4,
      notes: "Quick and reliable. The glaze caramelizes nicely. Salmon was slightly overdone — try 12 min next time.",
      wouldRepeat: true,
      servedTo: 2,
    },
    {
      recipeId: shakshuka.id,
      cookedOn: new Date("2026-02-16"),
      rating: 5,
      notes: "Sunday brunch winner. Added extra feta and a pinch of cayenne. Served with sourdough.",
      wouldRepeat: true,
      servedTo: 2,
    },
  ];

  for (const log of cookLogData) {
    const count = await prisma.cookLog.count({ where: { recipeId: log.recipeId } });
    if (count === 0) {
      await prisma.cookLog.create({ data: log });
    }
  }

  // ============ USER PREFERENCES ============
  const existingPrefs = await prisma.userPreferences.findFirst();
  if (existingPrefs) {
    await prisma.userPreferences.update({
      where: { id: existingPrefs.id },
      data: {
        equipment: JSON.stringify(["OVEN", "STOVETOP", "INSTANT_POT", "AIR_FRYER", "BLENDER", "FOOD_PROCESSOR"]),
        defaultServings: 2,
        defaultMaxTimeMin: 45,
        dietaryTagsExclude: JSON.stringify([]),
        cuisinesExclude: JSON.stringify([]),
        defaultComplexity: "ANY",
        wantVariety: true,
        wantGrowth: true,
      },
    });
  } else {
    await prisma.userPreferences.create({
      data: {
        equipment: JSON.stringify(["OVEN", "STOVETOP", "INSTANT_POT", "AIR_FRYER", "BLENDER", "FOOD_PROCESSOR"]),
        defaultServings: 2,
        defaultMaxTimeMin: 45,
        dietaryTagsExclude: JSON.stringify([]),
        cuisinesExclude: JSON.stringify([]),
        defaultComplexity: "ANY",
        wantVariety: true,
        wantGrowth: true,
      },
    });
  }

  console.log(`Seed complete:
  - ${techniqueData.length} techniques
  - ${itemsData.length} inventory items with batches
  - 10 recipes
  - ${cookLogData.length} cook log entries
  - 1 user preferences row`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
