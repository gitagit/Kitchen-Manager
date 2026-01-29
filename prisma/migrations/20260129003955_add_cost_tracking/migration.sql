-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "defaultCostCents" INTEGER;

-- AlterTable
ALTER TABLE "ItemBatch" ADD COLUMN     "costCents" INTEGER;
