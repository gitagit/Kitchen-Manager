import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logs = await prisma.recipeEditLog.findMany({
    where: { recipeId: id },
    orderBy: { editedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    logs: logs.map(l => ({
      ...l,
      changedFields: JSON.parse(l.changedFields) as string[],
    }))
  });
}
