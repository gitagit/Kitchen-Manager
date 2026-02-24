-- ============================================================
-- Multi-user support: add User/Workspace models,
-- scope all data models to workspaceId
-- ============================================================

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateTable OAuthAccount
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");

-- CreateTable Workspace
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable WorkspaceMember
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateTable WorkspaceInvite
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceInvite_code_key" ON "WorkspaceInvite"("code");
CREATE INDEX "WorkspaceInvite_code_idx" ON "WorkspaceInvite"("code");

-- ForeignKeys for new tables
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Add workspaceId to existing data models (nullable first)
-- ============================================================
ALTER TABLE "Item" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Recipe" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Technique" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "GroceryItem" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "MealPlan" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "UserPreferences" ADD COLUMN "workspaceId" TEXT;

-- ============================================================
-- Create legacy workspace and backfill existing data
-- ============================================================
INSERT INTO "Workspace" (id, name, "createdAt")
VALUES ('legacy-workspace', 'My Kitchen', NOW());

UPDATE "Item" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;
UPDATE "Recipe" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;
UPDATE "Technique" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;
UPDATE "GroceryItem" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;
UPDATE "MealPlan" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;
UPDATE "UserPreferences" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;

-- ============================================================
-- Set NOT NULL after backfill
-- ============================================================
ALTER TABLE "Item" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Recipe" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Technique" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "GroceryItem" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "MealPlan" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "UserPreferences" ALTER COLUMN "workspaceId" SET NOT NULL;

-- ============================================================
-- Drop old single-column unique constraints, add workspace-scoped ones
-- ============================================================

-- Item: name @unique -> @@unique([workspaceId, name])
DROP INDEX "Item_name_key";
CREATE UNIQUE INDEX "Item_workspaceId_name_key" ON "Item"("workspaceId", "name");
CREATE INDEX "Item_workspaceId_idx" ON "Item"("workspaceId");
ALTER TABLE "Item" ADD CONSTRAINT "Item_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recipe: title @unique -> @@unique([workspaceId, title])
DROP INDEX "Recipe_title_key";
CREATE UNIQUE INDEX "Recipe_workspaceId_title_key" ON "Recipe"("workspaceId", "title");
CREATE INDEX "Recipe_workspaceId_idx" ON "Recipe"("workspaceId");
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Technique: name @unique -> @@unique([workspaceId, name])
DROP INDEX "Technique_name_key";
CREATE UNIQUE INDEX "Technique_workspaceId_name_key" ON "Technique"("workspaceId", "name");
CREATE INDEX "Technique_workspaceId_idx" ON "Technique"("workspaceId");
ALTER TABLE "Technique" ADD CONSTRAINT "Technique_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GroceryItem
CREATE INDEX "GroceryItem_workspaceId_idx" ON "GroceryItem"("workspaceId");
ALTER TABLE "GroceryItem" ADD CONSTRAINT "GroceryItem_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MealPlan: @@unique([date, slot]) -> @@unique([workspaceId, date, slot])
DROP INDEX "MealPlan_date_slot_key";
DROP INDEX "MealPlan_date_idx";
CREATE UNIQUE INDEX "MealPlan_workspaceId_date_slot_key" ON "MealPlan"("workspaceId", "date", "slot");
CREATE INDEX "MealPlan_workspaceId_date_idx" ON "MealPlan"("workspaceId", "date");
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserPreferences: singleton -> workspaceId unique
CREATE UNIQUE INDEX "UserPreferences_workspaceId_key" ON "UserPreferences"("workspaceId");
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
