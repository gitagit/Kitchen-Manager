import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserPreferencesSchema } from "@/app/api/_shared";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

function deserialize(row: {
  equipment: string;
  defaultServings: number;
  defaultMaxTimeMin: number;
  dietaryTagsExclude: string;
  cuisinesExclude: string;
  defaultComplexity: string;
  wantVariety: boolean;
  wantGrowth: boolean;
  showGamification: boolean;
}) {
  return {
    equipment: JSON.parse(row.equipment) as string[],
    defaultServings: row.defaultServings,
    defaultMaxTimeMin: row.defaultMaxTimeMin,
    dietaryTagsExclude: JSON.parse(row.dietaryTagsExclude) as string[],
    cuisinesExclude: JSON.parse(row.cuisinesExclude) as string[],
    defaultComplexity: row.defaultComplexity,
    wantVariety: row.wantVariety,
    wantGrowth: row.wantGrowth,
    showGamification: row.showGamification,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const row = await prisma.userPreferences.findUnique({ where: { workspaceId } });
  if (!row) {
    return NextResponse.json(DEFAULTS);
  }
  return NextResponse.json(deserialize(row));
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();
  const parsed = UserPreferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const fields: Record<string, unknown> = {};
  if (data.equipment !== undefined) fields.equipment = JSON.stringify(data.equipment);
  if (data.defaultServings !== undefined) fields.defaultServings = data.defaultServings;
  if (data.defaultMaxTimeMin !== undefined) fields.defaultMaxTimeMin = data.defaultMaxTimeMin;
  if (data.dietaryTagsExclude !== undefined) fields.dietaryTagsExclude = JSON.stringify(data.dietaryTagsExclude);
  if (data.cuisinesExclude !== undefined) fields.cuisinesExclude = JSON.stringify(data.cuisinesExclude);
  if (data.defaultComplexity !== undefined) fields.defaultComplexity = data.defaultComplexity;
  if (data.wantVariety !== undefined) fields.wantVariety = data.wantVariety;
  if (data.wantGrowth !== undefined) fields.wantGrowth = data.wantGrowth;
  if (data.showGamification !== undefined) fields.showGamification = data.showGamification;

  const row = await prisma.userPreferences.upsert({
    where: { workspaceId },
    create: { workspaceId, ...fields } as Parameters<typeof prisma.userPreferences.create>[0]["data"],
    update: fields,
  });

  return NextResponse.json(deserialize(row));
}
