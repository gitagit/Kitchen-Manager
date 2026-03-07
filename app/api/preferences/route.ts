import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserPreferencesSchema } from "@/app/api/_shared";
import { getAuthContext } from "@/lib/mobile-auth";

const DEFAULTS = {
  equipment: ["OVEN", "STOVETOP"],
  defaultServings: 2,
  defaultMaxTimeMin: 45,
  dietaryTagsExclude: [] as string[],
  cuisinesExclude: [] as string[],
  defaultComplexity: "ANY",
  wantVariety: true,
  wantGrowth: false,
  showGamification: false,
};

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const row = await prisma.userPreferences.findUnique({ where: { workspaceId } });
  if (!row) {
    return NextResponse.json(DEFAULTS);
  }
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const body = await req.json();
  const parsed = UserPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const fields: Record<string, unknown> = {};
  if (data.equipment !== undefined) fields.equipment = data.equipment;
  if (data.defaultServings !== undefined) fields.defaultServings = data.defaultServings;
  if (data.defaultMaxTimeMin !== undefined) fields.defaultMaxTimeMin = data.defaultMaxTimeMin;
  if (data.dietaryTagsExclude !== undefined) fields.dietaryTagsExclude = data.dietaryTagsExclude;
  if (data.cuisinesExclude !== undefined) fields.cuisinesExclude = data.cuisinesExclude;
  if (data.defaultComplexity !== undefined) fields.defaultComplexity = data.defaultComplexity;
  if (data.wantVariety !== undefined) fields.wantVariety = data.wantVariety;
  if (data.wantGrowth !== undefined) fields.wantGrowth = data.wantGrowth;
  if (data.showGamification !== undefined) fields.showGamification = data.showGamification;
  if (data.calorieGoal  !== undefined) fields.calorieGoal  = data.calorieGoal  ?? null;
  if (data.proteinGoalG !== undefined) fields.proteinGoalG = data.proteinGoalG ?? null;
  if (data.carbsGoalG   !== undefined) fields.carbsGoalG   = data.carbsGoalG   ?? null;
  if (data.fatGoalG     !== undefined) fields.fatGoalG     = data.fatGoalG     ?? null;

  const row = await prisma.userPreferences.upsert({
    where: { workspaceId },
    create: { workspaceId, ...fields } as Parameters<typeof prisma.userPreferences.create>[0]["data"],
    update: fields,
  });

  return NextResponse.json(row);
}
