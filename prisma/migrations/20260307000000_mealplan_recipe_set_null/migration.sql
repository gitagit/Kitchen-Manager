-- AlterForeignKey: change MealPlan.recipeId from RESTRICT to SET NULL on delete
ALTER TABLE "MealPlan" DROP CONSTRAINT "MealPlan_recipeId_fkey";
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
