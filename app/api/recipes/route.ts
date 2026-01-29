import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normName } from "@/lib/normalize";

const RecipeSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive().optional(),
  servingsMax: z.number().int().positive().optional(),
  handsOnMin: z.number().int().positive().optional(),
  totalMin: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  equipment: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  seasons: z.array(z.string()).optional(),
  instructions: z.string().min(1),
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      required: z.boolean().optional(),
      quantityText: z.string().optional(),
      preparation: z.string().optional(),
      substitutions: z.array(z.string()).optional()
    })
  ).min(1),
  
  // New fields
  source: z.enum(["PERSONAL", "FAMILY", "WEB", "COOKBOOK", "FRIEND"]).optional(),
  sourceRef: z.string().optional(),
  cuisine: z.string().optional(),
  complexity: z.enum(["FAMILIAR", "STRETCH", "CHALLENGE"]).optional(),
  techniques: z.array(z.string()).optional() // technique names
});

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { title: "asc" },
    include: {
      ingredients: true,
      cookLogs: { orderBy: { cookedOn: "desc" } },
      techniques: { include: { technique: true } }
    }
  });

  // Parse JSON string fields to arrays
  const parsed = recipes.map(r => ({
    ...r,
    equipment: typeof r.equipment === "string" ? JSON.parse(r.equipment) : r.equipment,
    tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags,
    seasons: typeof r.seasons === "string" ? JSON.parse(r.seasons) : r.seasons,
    ingredients: r.ingredients.map(i => ({
      ...i,
      substitutions: typeof i.substitutions === "string" ? JSON.parse(i.substitutions) : i.substitutions
    }))
  }));

  return NextResponse.json({ recipes: parsed });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = RecipeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const r = parsed.data;
  
  // Handle techniques: find or create each one
  const techniqueConnections: { techniqueId: string }[] = [];
  if (r.techniques?.length) {
    for (const techName of r.techniques) {
      const normalized = normName(techName);
      const technique = await prisma.technique.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized, comfort: 0 }
      });
      techniqueConnections.push({ techniqueId: technique.id });
    }
  }

  const created = await prisma.recipe.upsert({
    where: { title: r.title.trim() },
    update: {
      servings: r.servings ?? undefined,
      servingsMax: r.servingsMax ?? undefined,
      handsOnMin: r.handsOnMin ?? undefined,
      totalMin: r.totalMin ?? undefined,
      difficulty: r.difficulty ?? undefined,
      equipment: r.equipment ?? undefined,
      tags: r.tags ?? undefined,
      seasons: r.seasons ?? undefined,
      instructions: r.instructions,
      source: r.source ?? undefined,
      sourceRef: r.sourceRef ?? undefined,
      cuisine: r.cuisine ?? undefined,
      complexity: r.complexity ?? undefined,
      ingredients: {
        deleteMany: {},
        create: r.ingredients.map((i) => ({
          name: i.name,
          required: i.required ?? true,
          quantityText: i.quantityText ?? null,
          preparation: i.preparation ?? null,
          substitutions: i.substitutions ?? []
        }))
      },
      techniques: {
        deleteMany: {},
        create: techniqueConnections
      }
    },
    create: {
      title: r.title.trim(),
      servings: r.servings ?? 2,
      servingsMax: r.servingsMax ?? null,
      handsOnMin: r.handsOnMin ?? 15,
      totalMin: r.totalMin ?? 30,
      difficulty: r.difficulty ?? 2,
      equipment: r.equipment ?? [],
      tags: r.tags ?? [],
      seasons: r.seasons ?? [],
      instructions: r.instructions,
      source: r.source ?? "PERSONAL",
      sourceRef: r.sourceRef ?? null,
      cuisine: r.cuisine ?? null,
      complexity: r.complexity ?? "FAMILIAR",
      ingredients: {
        create: r.ingredients.map((i) => ({
          name: i.name,
          required: i.required ?? true,
          quantityText: i.quantityText ?? null,
          preparation: i.preparation ?? null,
          substitutions: i.substitutions ?? []
        }))
      },
      techniques: {
        create: techniqueConnections
      }
    }
  });

  return NextResponse.json({ recipe: created });
}

export async function PUT(req: Request) {
  const body = await req.json();

  const UpdateSchema = RecipeSchema.extend({
    id: z.string().min(1)
  });

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, ...r } = parsed.data;

  // Handle techniques: find or create each one
  const techniqueConnections: { techniqueId: string }[] = [];
  if (r.techniques?.length) {
    for (const techName of r.techniques) {
      const normalized = normName(techName);
      const technique = await prisma.technique.upsert({
        where: { name: normalized },
        update: {},
        create: { name: normalized, comfort: 0 }
      });
      techniqueConnections.push({ techniqueId: technique.id });
    }
  }

  const updated = await prisma.recipe.update({
    where: { id },
    data: {
      title: r.title.trim(),
      servings: r.servings ?? undefined,
      servingsMax: r.servingsMax ?? undefined,
      handsOnMin: r.handsOnMin ?? undefined,
      totalMin: r.totalMin ?? undefined,
      difficulty: r.difficulty ?? undefined,
      equipment: r.equipment ?? undefined,
      tags: r.tags ?? undefined,
      seasons: r.seasons ?? undefined,
      instructions: r.instructions,
      source: r.source ?? undefined,
      sourceRef: r.sourceRef ?? undefined,
      cuisine: r.cuisine ?? undefined,
      complexity: r.complexity ?? undefined,
      ingredients: {
        deleteMany: {},
        create: r.ingredients.map((i) => ({
          name: i.name,
          required: i.required ?? true,
          quantityText: i.quantityText ?? null,
          preparation: i.preparation ?? null,
          substitutions: i.substitutions ?? []
        }))
      },
      techniques: {
        deleteMany: {},
        create: techniqueConnections
      }
    }
  });

  return NextResponse.json({ recipe: updated });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  // Delete related records first
  await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
  await prisma.cookLog.deleteMany({ where: { recipeId: id } });
  await prisma.recipeTechnique.deleteMany({ where: { recipeId: id } });
  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
