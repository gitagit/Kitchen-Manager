import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const RecipeSchema = z.object({
  title: z.string().min(1).max(200),
  servings: z.number().int().positive().optional(),
  servingsMax: z.number().int().positive().optional(),
  handsOnMin: z.number().int().positive().optional(),
  totalMin: z.number().int().positive().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  equipment: z.array(z.string().max(50)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  seasons: z.array(z.string().max(20)).max(4).optional(),
  instructions: z.string().min(1).max(50000),
  ingredients: z.array(
    z.object({
      name: z.string().min(1).max(200),
      required: z.boolean().optional(),
      quantityText: z.string().max(100).optional(),
      preparation: z.string().max(200).optional(),
      substitutions: z.array(z.string().max(200)).max(10).optional()
    })
  ).min(1).max(100),

  // New fields
  source: z.enum(["PERSONAL", "FAMILY", "WEB", "COOKBOOK", "FRIEND"]).optional(),
  sourceRef: z.string().max(500).optional(),
  cuisine: z.string().max(100).optional(),
  complexity: z.enum(["FAMILIAR", "STRETCH", "CHALLENGE"]).optional(),
  techniques: z.array(z.string().max(100)).max(20).optional(),
  caloriesPerServing: z.number().int().positive().optional(),
  proteinG: z.number().int().nonnegative().optional(),
  carbsG: z.number().int().nonnegative().optional(),
  fatG: z.number().int().nonnegative().optional()
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const recipes = await prisma.recipe.findMany({
    where: { workspaceId },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

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
        where: { workspaceId_name: { workspaceId, name: normalized } },
        update: {},
        create: { workspaceId, name: normalized, comfort: 0 }
      });
      techniqueConnections.push({ techniqueId: technique.id });
    }
  }

  const created = await prisma.recipe.upsert({
    where: { workspaceId_title: { workspaceId, title: r.title.trim() } },
    update: {
      servings: r.servings ?? undefined,
      servingsMax: r.servingsMax ?? undefined,
      handsOnMin: r.handsOnMin ?? undefined,
      totalMin: r.totalMin ?? undefined,
      difficulty: r.difficulty ?? undefined,
      equipment: r.equipment ? JSON.stringify(r.equipment) : undefined,
      tags: r.tags ? JSON.stringify(r.tags) : undefined,
      seasons: r.seasons ? JSON.stringify(r.seasons) : undefined,
      instructions: r.instructions,
      source: r.source ?? undefined,
      sourceRef: r.sourceRef ?? undefined,
      cuisine: r.cuisine ?? undefined,
      complexity: r.complexity ?? undefined,
      caloriesPerServing: r.caloriesPerServing ?? undefined,
      proteinG: r.proteinG ?? undefined,
      carbsG: r.carbsG ?? undefined,
      fatG: r.fatG ?? undefined,
      ingredients: {
        deleteMany: {},
        create: r.ingredients.map((i) => ({
          name: i.name,
          required: i.required ?? true,
          quantityText: i.quantityText ?? null,
          preparation: i.preparation ?? null,
          substitutions: i.substitutions ? JSON.stringify(i.substitutions) : "[]"
        }))
      },
      techniques: {
        deleteMany: {},
        create: techniqueConnections
      }
    },
    create: {
      workspaceId,
      title: r.title.trim(),
      servings: r.servings ?? 2,
      servingsMax: r.servingsMax ?? null,
      handsOnMin: r.handsOnMin ?? 15,
      totalMin: r.totalMin ?? 30,
      difficulty: r.difficulty ?? 2,
      equipment: r.equipment ? JSON.stringify(r.equipment) : "[]",
      tags: r.tags ? JSON.stringify(r.tags) : "[]",
      seasons: r.seasons ? JSON.stringify(r.seasons) : "[]",
      instructions: r.instructions,
      source: r.source ?? "PERSONAL",
      sourceRef: r.sourceRef ?? null,
      cuisine: r.cuisine ?? null,
      complexity: r.complexity ?? "FAMILIAR",
      caloriesPerServing: r.caloriesPerServing ?? null,
      proteinG: r.proteinG ?? null,
      carbsG: r.carbsG ?? null,
      fatG: r.fatG ?? null,
      ingredients: {
        create: r.ingredients.map((i) => ({
          name: i.name,
          required: i.required ?? true,
          quantityText: i.quantityText ?? null,
          preparation: i.preparation ?? null,
          substitutions: i.substitutions ? JSON.stringify(i.substitutions) : "[]"
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();

  const UpdateSchema = RecipeSchema.extend({
    id: z.string().min(1),
    note: z.string().optional(),
  });

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, note, ...r } = parsed.data;

  // Fetch existing recipe to detect changes and verify workspace ownership
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true }
  });
  if (!existing || existing.workspaceId !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle techniques: find or create each one
  const techniqueConnections: { techniqueId: string }[] = [];
  if (r.techniques?.length) {
    for (const techName of r.techniques) {
      const normalized = normName(techName);
      const technique = await prisma.technique.upsert({
        where: { workspaceId_name: { workspaceId, name: normalized } },
        update: {},
        create: { workspaceId, name: normalized, comfort: 0 }
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
      equipment: r.equipment ? JSON.stringify(r.equipment) : undefined,
      tags: r.tags ? JSON.stringify(r.tags) : undefined,
      seasons: r.seasons ? JSON.stringify(r.seasons) : undefined,
      instructions: r.instructions,
      source: r.source ?? undefined,
      sourceRef: r.sourceRef ?? undefined,
      cuisine: r.cuisine ?? undefined,
      complexity: r.complexity ?? undefined,
      caloriesPerServing: r.caloriesPerServing ?? undefined,
      proteinG: r.proteinG ?? undefined,
      carbsG: r.carbsG ?? undefined,
      fatG: r.fatG ?? undefined,
      ingredients: {
        deleteMany: {},
        create: r.ingredients.map((i) => ({
          name: i.name,
          required: i.required ?? true,
          quantityText: i.quantityText ?? null,
          preparation: i.preparation ?? null,
          substitutions: i.substitutions ? JSON.stringify(i.substitutions) : "[]"
        }))
      },
      techniques: {
        deleteMany: {},
        create: techniqueConnections
      }
    }
  });

  // Detect changed fields and create edit log
  const changed: string[] = [];
  if (existing.title !== r.title.trim()) changed.push("title");
  if (existing.instructions !== r.instructions) changed.push("instructions");
  if (existing.servings !== (r.servings ?? existing.servings)) changed.push("servings");
  if (existing.totalMin !== (r.totalMin ?? existing.totalMin)) changed.push("totalMin");
  if (existing.handsOnMin !== (r.handsOnMin ?? existing.handsOnMin)) changed.push("handsOnMin");
  if (existing.difficulty !== (r.difficulty ?? existing.difficulty)) changed.push("difficulty");

  const ingKey = (i: { name: string; quantityText?: string | null }) =>
    `${i.name}|${i.quantityText ?? ""}`;
  const oldIngs = existing.ingredients.map(ingKey).sort().join("\n");
  const newIngs = r.ingredients.map(ingKey).sort().join("\n");
  if (oldIngs !== newIngs) changed.push("ingredients");

  if (changed.length > 0 || note) {
    await prisma.recipeEditLog.create({
      data: {
        recipeId: id,
        changedFields: JSON.stringify(changed),
        note: note ?? null,
      }
    });
  }

  return NextResponse.json({ recipe: updated });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  // Verify the recipe belongs to this workspace before deleting
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing || existing.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete related records first
  await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
  await prisma.cookLog.deleteMany({ where: { recipeId: id } });
  await prisma.recipeTechnique.deleteMany({ where: { recipeId: id } });
  await prisma.recipe.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
