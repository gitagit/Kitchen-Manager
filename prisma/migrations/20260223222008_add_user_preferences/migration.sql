-- AlterTable
ALTER TABLE "MealPlan" ADD COLUMN     "servings" INTEGER;

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "equipment" TEXT NOT NULL DEFAULT '["OVEN","STOVETOP"]',
    "defaultServings" INTEGER NOT NULL DEFAULT 2,
    "defaultMaxTimeMin" INTEGER NOT NULL DEFAULT 45,
    "dietaryTagsExclude" TEXT NOT NULL DEFAULT '[]',
    "cuisinesExclude" TEXT NOT NULL DEFAULT '[]',
    "defaultComplexity" TEXT NOT NULL DEFAULT 'ANY',
    "wantVariety" BOOLEAN NOT NULL DEFAULT true,
    "wantGrowth" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);
