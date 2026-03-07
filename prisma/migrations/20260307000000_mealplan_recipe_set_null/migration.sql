-- AddForeignKey (was missing from init migration)
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
