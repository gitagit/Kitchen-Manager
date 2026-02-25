-- Add daily nutrition goal fields to UserPreferences
ALTER TABLE "UserPreferences" ADD COLUMN "calorieGoal"  INTEGER;
ALTER TABLE "UserPreferences" ADD COLUMN "proteinGoalG" INTEGER;
ALTER TABLE "UserPreferences" ADD COLUMN "carbsGoalG"   INTEGER;
ALTER TABLE "UserPreferences" ADD COLUMN "fatGoalG"     INTEGER;
