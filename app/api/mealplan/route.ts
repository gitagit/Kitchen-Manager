import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const MealPlanSchema = z.object({
  date: z.string(), // ISO date string
  slot: z.enum(["breakfast", "lunch", "dinner"]),
  recipeId: z.string().optional(),
  notes: z.string().optional(),
  servings: z.number().int().positive().optional()
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  const where: { date?: { gte?: Date; lte?: Date } } = {};

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const plans = await prisma.mealPlan.findMany({
    where,
    orderBy: [{ date: "asc" }, { slot: "asc" }]
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = MealPlanSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { date, slot, recipeId, notes, servings } = parsed.data;
  const dateObj = new Date(date);

  // Upsert: update if exists for this date+slot, otherwise create
  const plan = await prisma.mealPlan.upsert({
    where: {
      date_slot: { date: dateObj, slot }
    },
    update: {
      recipeId: recipeId || null,
      notes: notes || null,
      servings: servings || null
    },
    create: {
      date: dateObj,
      slot,
      recipeId: recipeId || null,
      notes: notes || null,
      servings: servings || null
    }
  });

  return NextResponse.json({ plan });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  await prisma.mealPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
