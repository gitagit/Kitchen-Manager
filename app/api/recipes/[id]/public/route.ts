import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: {
      ingredients: { orderBy: { required: "desc" } },
      techniques: { include: { technique: { select: { name: true } } } }
    }
  });

  if (!recipe) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Expose only fields needed for read-only display; strip workspace internals
  return NextResponse.json({
    recipe: {
      id: recipe.id,
      title: recipe.title,
      cuisine: recipe.cuisine,
      complexity: recipe.complexity,
      servings: recipe.servings,
      servingsMax: recipe.servingsMax,
      handsOnMin: recipe.handsOnMin,
      totalMin: recipe.totalMin,
      difficulty: recipe.difficulty,
      equipment: recipe.equipment,
      tags: recipe.tags,
      seasons: recipe.seasons,
      instructions: recipe.instructions,
      source: recipe.source,
      sourceRef: recipe.sourceRef,
      caloriesPerServing: recipe.caloriesPerServing,
      proteinG: recipe.proteinG,
      carbsG: recipe.carbsG,
      fatG: recipe.fatG,
      ingredients: recipe.ingredients.map(i => ({
        name: i.name,
        required: i.required,
        quantityText: i.quantityText,
        preparation: i.preparation,
        substitutions: i.substitutions
      })),
      techniques: recipe.techniques.map(t => t.technique.name)
    }
  });
}
