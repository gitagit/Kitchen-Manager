ALTER TABLE "CookLog"    ADD CONSTRAINT "CookLog_rating_check"        CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE "Recipe"     ADD CONSTRAINT "Recipe_difficulty_check"      CHECK (difficulty >= 1 AND difficulty <= 5);
ALTER TABLE "Technique"  ADD CONSTRAINT "Technique_difficulty_check"   CHECK (difficulty >= 1 AND difficulty <= 5);
ALTER TABLE "Technique"  ADD CONSTRAINT "Technique_comfort_check"      CHECK (comfort >= 0 AND comfort <= 3);
ALTER TABLE "GroceryItem" ADD CONSTRAINT "GroceryItem_priority_check"  CHECK (priority >= 1 AND priority <= 3);