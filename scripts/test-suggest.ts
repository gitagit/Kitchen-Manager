import { prisma } from "../lib/db.js";
import { normName } from "../lib/normalize.js";
import { scoreRecipe, buildCuisineHistory, buildTechniqueComfort } from "../lib/scoring.js";

async function main() {
  const items = await prisma.item.findMany({ include: { batches: true } });
  const invNames = new Set(items.map((i) => normName(i.name)));

  const soon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const expiringNames = new Set(
    items
      .filter((i) => i.batches.some((b) => b.expiresOn && b.expiresOn <= soon))
      .map((i) => normName(i.name))
  );

  console.log("Expiring items:", [...expiringNames]);

  const recipes = await prisma.recipe.findMany({
    include: { ingredients: true, cookLogs: true, techniques: { include: { technique: true } } },
  });

  // Check what tags looks like
  const first = recipes[0];
  console.log("tags type:", typeof first.tags, "value:", first.tags);
  console.log("equipment type:", typeof first.equipment, "value:", first.equipment);

  try {
    const cuisineHistory = buildCuisineHistory(recipes);
    const techniques = await prisma.technique.findMany();
    const techniqueComfort = buildTechniqueComfort(techniques);

    const constraints = { wantVariety: true, wantGrowth: true };
    const scored = recipes
      .map((r) => scoreRecipe(r as any, invNames, expiringNames, constraints, cuisineHistory, techniqueComfort))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    console.log("\n=== TOP RESULTS ===");
    for (const r of scored) {
      console.log(`\n${r.title}`);
      console.log(`  Score: ${r.score}  Cuisine: ${r.cuisine}  Complexity: ${r.complexity}`);
      console.log(`  Have: ${r.have.join(", ")}`);
      if (r.missing.length) console.log(`  Missing: ${r.missing.join(", ")}`);
      console.log(`  Why: ${r.why.join(" | ")}`);
    }
  } catch (e) {
    console.error("ERROR:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
