import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const toDelete = [
  'Seoul 1BR Rent Prices',
  'Showrooming Equation: \\(p = 10.5 + 0.5x\\)',
  'Steelers 2-0 start history',
  '🧊 About "old" chicken stock'
];

async function main() {
  for (const title of toDelete) {
    const recipe = await prisma.recipe.findUnique({ where: { title } });
    if (recipe) {
      await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      await prisma.cookLog.deleteMany({ where: { recipeId: recipe.id } });
      await prisma.recipeTechnique.deleteMany({ where: { recipeId: recipe.id } });
      await prisma.recipe.delete({ where: { id: recipe.id } });
      console.log('✅ Deleted:', title);
    } else {
      console.log('⚠️ Not found:', title);
    }
  }
  await prisma.$disconnect();
}
main();
