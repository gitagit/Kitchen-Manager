import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ItemLocations, ItemCategories } from "@/app/api/_shared";
import { normName } from "@/lib/normalize";

const schema = z.object({
  text: z.string().min(1),
  defaultLocation: z.enum(ItemLocations).optional()
});

function headingToCategory(h: string): string {
  const n = normName(h);
  if (n.includes("spice")) return "SPICE";
  if (n.includes("frozen") || n.includes("freezer")) return "FROZEN";
  if (n.includes("produce") || n.includes("veg") || n.includes("fruit")) return "PRODUCE";
  if (n.includes("meat") || n.includes("seafood") || n.includes("protein")) return "MEAT";
  if (n.includes("dairy")) return "DAIRY";
  if (n.includes("condiment") || n.includes("sauce")) return "CONDIMENT";
  if (n.includes("pantry") || n.includes("canned") || n.includes("dry")) return "PANTRY";
  return "OTHER";
}

function categoryToDefaultLocation(c: string): string {
  switch (c) {
    case "FROZEN":
    case "MEAT":
      return "FREEZER";
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

  let currentHeading = "PANTRY";
  let currentCategory: string = "PANTRY";

  let created = 0;
  for (const line of lines) {
    const headingMatch = line.match(/^([A-Za-z][A-Za-z \-\/]+):$/);
    if (headingMatch) {
      currentHeading = headingMatch[1];
      currentCategory = headingToCategory(currentHeading);
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

    const loc = defaultLocation ?? categoryToDefaultLocation(currentCategory);

    const item = await prisma.item.upsert({
      where: { name: normalizedName },
      update: { category: currentCategory, location: loc },
      create: {
        name: normalizedName,
        category: currentCategory,
        location: loc
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
