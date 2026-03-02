import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ItemLocations, ItemCategories } from "@/app/api/_shared";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const schema = z.object({
  text: z.string().min(1),
  defaultLocation: z.enum(ItemLocations).optional()
});

function headingToCategory(h: string): string {
  const n = normName(h);
  if (n.includes("spice")) return "SPICE";
  if (n.includes("seafood") || n.includes("fish")) return "SEAFOOD";
  if (n.includes("produce") || n.includes("veg") || n.includes("fruit")) return "PRODUCE";
  if (n.includes("meat") || n.includes("protein")) return "MEAT";
  if (n.includes("dairy")) return "DAIRY";
  if (n.includes("condiment") || n.includes("sauce")) return "CONDIMENT";
  if (n.includes("pantry") || n.includes("canned") || n.includes("dry")) return "PANTRY";
  return "OTHER";
}

// Returns FREEZER for headings like "Frozen:", "Freezer:" so all items under that section
// get the correct location regardless of category.
function headingToLocationOverride(h: string): string | null {
  const n = normName(h);
  return n.includes("frozen") || n.includes("freezer") ? "FREEZER" : null;
}

function categoryToDefaultLocation(c: string): string {
  switch (c) {
    case "SEAFOOD":
    case "MEAT":
    case "PRODUCE":
    case "DAIRY":
      return "FRIDGE";
    case "SPICE":
    case "CONDIMENT":
    case "PANTRY":
    default:
      return "PANTRY";
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { text, defaultLocation } = parsed.data;

  // Format supported:
  // Pantry:
  // - canned chickpeas (2 cans)
  // Spices:
  // - black pepper
  // Or just lines without headings; will go to OTHER/PANTRY.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let currentCategory: string = "PANTRY";
  let currentLocationOverride: string | null = null;

  let created = 0;
  for (const line of lines) {
    const headingMatch = line.match(/^([A-Za-z][A-Za-z \-\/]+):$/);
    if (headingMatch) {
      const heading = headingMatch[1];
      currentCategory = headingToCategory(heading);
      currentLocationOverride = headingToLocationOverride(heading);
      continue;
    }

    const cleaned = line.replace(/^[-*•]+\s*/, "");
    // split quantity hints like "item (2 cans)" or "item - 2 cans"
    let name = cleaned;
    let qty: string | null = null;

    const paren = cleaned.match(/^(.*)\(([^)]+)\)\s*$/);
    if (paren) {
      name = paren[1].trim();
      qty = paren[2].trim();
    } else {
      const dash = cleaned.match(/^(.*)\s+-\s+(.+)$/);
      if (dash) {
        name = dash[1].trim();
        qty = dash[2].trim();
      }
    }

    const normalizedName = normName(name);
    if (!normalizedName) continue;

    const loc = defaultLocation ?? currentLocationOverride ?? categoryToDefaultLocation(currentCategory);

    const item = await prisma.item.upsert({
      where: { workspaceId_name: { workspaceId, name: normalizedName } },
      update: { category: currentCategory, location: loc },
      create: {
        workspaceId,
        name: normalizedName,
        category: currentCategory,
        location: loc,
        lastConfirmed: new Date()
      }
    });

    if (qty) {
      await prisma.itemBatch.create({
        data: { itemId: item.id, quantityText: qty, purchasedOn: new Date() }
      });
    } else {
      // If no qty, ensure at least one batch exists
      const hasBatch = await prisma.itemBatch.findFirst({ where: { itemId: item.id } });
      if (!hasBatch) {
        await prisma.itemBatch.create({
          data: { itemId: item.id, quantityText: "1", purchasedOn: new Date() }
        });
      }
    }

    created += 1;
  }

  return NextResponse.json({ created });
}
