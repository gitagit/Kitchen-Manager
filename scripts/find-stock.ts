import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.recipe.findMany({
    where: { title: { contains: 'stock' } },
    select: { id: true, title: true }
  });
  console.log('Recipes with "stock" in title:', recipes);

  if (recipes.length > 0) {
    for (const r of recipes) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: r.id } });
      await prisma.cookLog.deleteMany({ where: { recipeId: r.id } });
      await prisma.recipeTechnique.deleteMany({ where: { recipeId: r.id } });
      await prisma.recipe.delete({ where: { id: r.id } });
      console.log('✅ Deleted:', r.title);
    }
  }

  await prisma.$disconnect();
}
main();
