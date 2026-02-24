-- CreateTable
CREATE TABLE "RecipeEditLog" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedFields" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT,

    CONSTRAINT "RecipeEditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeEditLog_recipeId_idx" ON "RecipeEditLog"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeEditLog_editedAt_idx" ON "RecipeEditLog"("editedAt");

-- AddForeignKey
ALTER TABLE "RecipeEditLog" ADD CONSTRAINT "RecipeEditLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
