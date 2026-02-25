-- Convert JSON-as-string columns to native JSONB
-- Drop defaults first (can't auto-cast), alter type with USING, then restore defaults

-- Recipe: equipment
ALTER TABLE "Recipe" ALTER COLUMN "equipment" DROP DEFAULT;
ALTER TABLE "Recipe" ALTER COLUMN "equipment" TYPE jsonb USING "equipment"::jsonb;
ALTER TABLE "Recipe" ALTER COLUMN "equipment" SET DEFAULT '[]'::jsonb;

-- Recipe: tags
ALTER TABLE "Recipe" ALTER COLUMN "tags" DROP DEFAULT;
ALTER TABLE "Recipe" ALTER COLUMN "tags" TYPE jsonb USING "tags"::jsonb;
ALTER TABLE "Recipe" ALTER COLUMN "tags" SET DEFAULT '[]'::jsonb;

-- Recipe: seasons
ALTER TABLE "Recipe" ALTER COLUMN "seasons" DROP DEFAULT;
ALTER TABLE "Recipe" ALTER COLUMN "seasons" TYPE jsonb USING "seasons"::jsonb;
ALTER TABLE "Recipe" ALTER COLUMN "seasons" SET DEFAULT '[]'::jsonb;

-- RecipeIngredient: substitutions
ALTER TABLE "RecipeIngredient" ALTER COLUMN "substitutions" DROP DEFAULT;
ALTER TABLE "RecipeIngredient" ALTER COLUMN "substitutions" TYPE jsonb USING "substitutions"::jsonb;
ALTER TABLE "RecipeIngredient" ALTER COLUMN "substitutions" SET DEFAULT '[]'::jsonb;

-- RecipeEditLog: changedFields
ALTER TABLE "RecipeEditLog" ALTER COLUMN "changedFields" DROP DEFAULT;
ALTER TABLE "RecipeEditLog" ALTER COLUMN "changedFields" TYPE jsonb USING "changedFields"::jsonb;
ALTER TABLE "RecipeEditLog" ALTER COLUMN "changedFields" SET DEFAULT '[]'::jsonb;

-- UserPreferences: equipment
ALTER TABLE "UserPreferences" ALTER COLUMN "equipment" DROP DEFAULT;
ALTER TABLE "UserPreferences" ALTER COLUMN "equipment" TYPE jsonb USING "equipment"::jsonb;
ALTER TABLE "UserPreferences" ALTER COLUMN "equipment" SET DEFAULT '["OVEN","STOVETOP"]'::jsonb;

-- UserPreferences: dietaryTagsExclude
ALTER TABLE "UserPreferences" ALTER COLUMN "dietaryTagsExclude" DROP DEFAULT;
ALTER TABLE "UserPreferences" ALTER COLUMN "dietaryTagsExclude" TYPE jsonb USING "dietaryTagsExclude"::jsonb;
ALTER TABLE "UserPreferences" ALTER COLUMN "dietaryTagsExclude" SET DEFAULT '[]'::jsonb;

-- UserPreferences: cuisinesExclude
ALTER TABLE "UserPreferences" ALTER COLUMN "cuisinesExclude" DROP DEFAULT;
ALTER TABLE "UserPreferences" ALTER COLUMN "cuisinesExclude" TYPE jsonb USING "cuisinesExclude"::jsonb;
ALTER TABLE "UserPreferences" ALTER COLUMN "cuisinesExclude" SET DEFAULT '[]'::jsonb;
