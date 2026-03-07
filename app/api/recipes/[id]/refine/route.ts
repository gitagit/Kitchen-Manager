import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { id } = await params;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = z.object({ instruction: z.string().min(1).max(2000) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  const { instruction } = parsed.data;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true, techniques: { include: { technique: true } } },
  });
  if (!recipe || recipe.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ingredientLines = recipe.ingredients.map(i => {
    let line = i.name;
    if (i.quantityText) line = `${i.quantityText} ${line}`;
    if (i.preparation) line += ` [${i.preparation}]`;
    if (!i.required) line += " (optional)";
    return line;
  }).join("\n");

  const recipeContext = `Recipe: ${recipe.title}
Cuisine: ${recipe.cuisine ?? "—"}
Serves: ${recipe.servings}${recipe.servingsMax ? `–${recipe.servingsMax}` : ""}
Hands-on: ${recipe.handsOnMin} min | Total: ${recipe.totalMin} min
Difficulty: ${recipe.difficulty}/5 | Complexity: ${recipe.complexity}
Equipment: ${(recipe.equipment as string[]).join(", ") || "—"}
Tags: ${(recipe.tags as string[]).join(", ") || "—"}

Ingredients:
${ingredientLines}

Instructions:
${recipe.instructions}`;

  const client = new Anthropic();

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [
        {
          name: "modify_recipe",
          description: "Return a complete modified version of the recipe when the user wants to change it (ingredients, instructions, times, dietary swaps, etc.).",
          input_schema: {
            type: "object" as const,
            properties: {
              title:            { type: "string" },
              servings:         { type: "number" },
              servingsMax:      { type: "number" },
              handsOnMin:       { type: "number" },
              totalMin:         { type: "number" },
              difficulty:       { type: "number", description: "1–5" },
              complexity:       { type: "string", enum: ["FAMILIAR", "STRETCH", "CHALLENGE"] },
              cuisine:          { type: "string" },
              instructions:     { type: "string" },
              ingredients: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name:          { type: "string" },
                    quantityText:  { type: "string" },
                    preparation:   { type: "string" },
                    required:      { type: "boolean" },
                    substitutions: { type: "array", items: { type: "string" } },
                  },
                  required: ["name"],
                },
              },
              caloriesPerServing: { type: "number" },
              proteinG:           { type: "number" },
              carbsG:             { type: "number" },
              fatG:               { type: "number" },
              changeNote:         { type: "string", description: "One-line summary of what was changed" },
            },
            required: ["title", "servings", "handsOnMin", "totalMin", "difficulty", "instructions", "ingredients"],
          },
        },
        {
          name: "answer_question",
          description: "Answer a question about the recipe without modifying it (substitutions, technique explanations, serving suggestions, etc.).",
          input_schema: {
            type: "object" as const,
            properties: {
              answer: { type: "string" },
            },
            required: ["answer"],
          },
        },
      ],
      tool_choice: { type: "any" },
      messages: [
        {
          role: "user",
          content: `Here is a recipe:\n\n${recipeContext}\n\nUser request: ${instruction}`,
        },
      ],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Claude API error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const toolUse = message.content.find(c => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "No response from AI" }, { status: 500 });
  }

  if (toolUse.name === "answer_question") {
    const input = toolUse.input as { answer: string };
    return NextResponse.json({ type: "answer", text: input.answer });
  }

  // modify_recipe
  type ModInput = {
    title: string;
    servings: number;
    servingsMax?: number;
    handsOnMin: number;
    totalMin: number;
    difficulty: number;
    complexity?: string;
    cuisine?: string;
    instructions: string;
    ingredients: { name: string; quantityText?: string; preparation?: string; required?: boolean; substitutions?: string[] }[];
    caloriesPerServing?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    changeNote?: string;
  };
  const mod = toolUse.input as ModInput;

  // Detect changed fields for edit log
  const changed: string[] = [];
  if (recipe.title !== mod.title) changed.push("title");
  if (recipe.instructions !== mod.instructions) changed.push("instructions");
  if (recipe.servings !== mod.servings) changed.push("servings");
  if (recipe.totalMin !== mod.totalMin) changed.push("totalMin");
  if (recipe.handsOnMin !== mod.handsOnMin) changed.push("handsOnMin");
  if (recipe.difficulty !== mod.difficulty) changed.push("difficulty");
  const ingKey = (i: { name: string; quantityText?: string | null }) => `${i.name}|${i.quantityText ?? ""}`;
  const oldIngs = recipe.ingredients.map(ingKey).sort().join("\n");
  const newIngs = mod.ingredients.map(ingKey).sort().join("\n");
  if (oldIngs !== newIngs) changed.push("ingredients");

  // Preserve existing technique links
  const techniqueConnections = recipe.techniques.map(t => ({ techniqueId: t.technique.id }));

  const updated = await prisma.recipe.update({
    where: { id },
    data: {
      title:              mod.title.trim(),
      servings:           mod.servings,
      servingsMax:        mod.servingsMax ?? null,
      handsOnMin:         mod.handsOnMin,
      totalMin:           mod.totalMin,
      difficulty:         Math.min(5, Math.max(1, mod.difficulty)),
      complexity:         (mod.complexity ?? recipe.complexity) as string,
      cuisine:            mod.cuisine ?? recipe.cuisine,
      instructions:       mod.instructions,
      caloriesPerServing: mod.caloriesPerServing ?? recipe.caloriesPerServing,
      proteinG:           mod.proteinG ?? recipe.proteinG,
      carbsG:             mod.carbsG ?? recipe.carbsG,
      fatG:               mod.fatG ?? recipe.fatG,
      ingredients: {
        deleteMany: {},
        create: mod.ingredients.map(i => ({
          name:          i.name,
          required:      i.required ?? true,
          quantityText:  i.quantityText ?? null,
          preparation:   i.preparation ?? null,
          substitutions: i.substitutions ?? [],
        })),
      },
      techniques: {
        deleteMany: {},
        create: techniqueConnections,
      },
    },
    include: {
      ingredients: true,
      cookLogs: { orderBy: { cookedOn: "desc" } },
      techniques: { include: { technique: true } },
    },
  });

  await prisma.recipeEditLog.create({
    data: {
      recipeId: id,
      changedFields: changed,
      note: `[AI] ${mod.changeNote ?? instruction.slice(0, 120)}`,
    },
  });

  return NextResponse.json({ type: "modified", recipe: updated });
}
