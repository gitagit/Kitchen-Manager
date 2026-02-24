/**
 * One-time backfill script: normalizes recipe instructions to numbered format.
 *
 * Usage:
 *   node --loader ts-node/esm scripts/normalize-instructions.ts           # live run
 *   node --loader ts-node/esm scripts/normalize-instructions.ts --dry-run # preview only
 */

import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Anthropic();
const dryRun = process.argv.includes("--dry-run");

async function normalizeInstructions(raw: string): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Reformat these recipe instructions as numbered steps. Each step should start with an action verb, cover one action, and include timing/sensory cues where present. The final step must be a serving instruction. Return ONLY the numbered steps joined with single newlines (no blank lines between steps).\n\nInstructions:\n${raw}`
    }]
  });
  return (msg.content[0] as any).text.trim();
}

async function main() {
  const recipes = await prisma.recipe.findMany({ select: { id: true, title: true, instructions: true } });
  console.log(`Found ${recipes.length} recipes. Dry run: ${dryRun}\n`);

  let skipped = 0;
  let updated = 0;
  let failed = 0;

  for (const recipe of recipes) {
    const alreadyNumbered = /^\s*1\./.test(recipe.instructions);
    if (alreadyNumbered) {
      console.log(`  SKIP  ${recipe.title}`);
      skipped++;
      continue;
    }

    try {
      const normalized = await normalizeInstructions(recipe.instructions);
      if (dryRun) {
        console.log(`  DRY   ${recipe.title}`);
        console.log(`        Before: ${recipe.instructions.slice(0, 80).replace(/\n/g, "↵")}...`);
        console.log(`        After:  ${normalized.slice(0, 80).replace(/\n/g, "↵")}...`);
      } else {
        await prisma.recipe.update({ where: { id: recipe.id }, data: { instructions: normalized } });
        console.log(`  OK    ${recipe.title}`);
      }
      updated++;
    } catch (err) {
      console.error(`  FAIL  ${recipe.title}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Skipped: ${skipped}, ${dryRun ? "Would update" : "Updated"}: ${updated}, Failed: ${failed}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
