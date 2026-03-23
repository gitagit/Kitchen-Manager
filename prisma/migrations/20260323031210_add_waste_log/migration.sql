-- DropForeignKey
ALTER TABLE "GroceryItem" DROP CONSTRAINT "GroceryItem_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "MealPlan" DROP CONSTRAINT "MealPlan_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Recipe" DROP CONSTRAINT "Recipe_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Technique" DROP CONSTRAINT "Technique_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_workspaceId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "WasteLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantityText" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "costCents" INTEGER,
    "notes" TEXT,
    "discardedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WasteLog_workspaceId_idx" ON "WasteLog"("workspaceId");

-- CreateIndex
CREATE INDEX "WasteLog_workspaceId_discardedOn_idx" ON "WasteLog"("workspaceId", "discardedOn");
