-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "staple" BOOLEAN NOT NULL DEFAULT false,
    "parLevel" INTEGER,
    "preferredBrand" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemBatch" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantityText" TEXT NOT NULL,
    "expiresOn" TIMESTAMP(3),
    "purchasedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 2,
    "servingsMax" INTEGER,
    "handsOnMin" INTEGER NOT NULL DEFAULT 15,
    "totalMin" INTEGER NOT NULL DEFAULT 30,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "source" TEXT NOT NULL DEFAULT 'PERSONAL',
    "sourceRef" TEXT,
    "cuisine" TEXT,
    "equipment" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "seasons" TEXT NOT NULL DEFAULT '[]',
    "complexity" TEXT NOT NULL DEFAULT 'FAMILIAR',
    "instructions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "quantityText" TEXT,
    "preparation" TEXT,
    "categoryHint" TEXT,
    "substitutions" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookLog" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "cookedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER NOT NULL,
    "notes" TEXT,
    "wouldRepeat" BOOLEAN NOT NULL DEFAULT true,
    "servedTo" INTEGER,

    CONSTRAINT "CookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technique" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 2,
    "comfort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeTechnique" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "techniqueId" TEXT NOT NULL,

    CONSTRAINT "RecipeTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "quantityText" TEXT,
    "reason" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "acquired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" TEXT NOT NULL,
    "recipeId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE INDEX "ItemBatch_itemId_idx" ON "ItemBatch"("itemId");

-- CreateIndex
CREATE INDEX "ItemBatch_expiresOn_idx" ON "ItemBatch"("expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_title_key" ON "Recipe"("title");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "CookLog_recipeId_idx" ON "CookLog"("recipeId");

-- CreateIndex
CREATE INDEX "CookLog_cookedOn_idx" ON "CookLog"("cookedOn");

-- CreateIndex
CREATE UNIQUE INDEX "Technique_name_key" ON "Technique"("name");

-- CreateIndex
CREATE INDEX "RecipeTechnique_recipeId_idx" ON "RecipeTechnique"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeTechnique_techniqueId_idx" ON "RecipeTechnique"("techniqueId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeTechnique_recipeId_techniqueId_key" ON "RecipeTechnique"("recipeId", "techniqueId");

-- CreateIndex
CREATE INDEX "MealPlan_date_idx" ON "MealPlan"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_date_slot_key" ON "MealPlan"("date", "slot");

-- AddForeignKey
ALTER TABLE "ItemBatch" ADD CONSTRAINT "ItemBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CookLog" ADD CONSTRAINT "CookLog_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTechnique" ADD CONSTRAINT "RecipeTechnique_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeTechnique" ADD CONSTRAINT "RecipeTechnique_techniqueId_fkey" FOREIGN KEY ("techniqueId") REFERENCES "Technique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
