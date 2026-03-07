import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/mobile-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const { id } = await params;

  // Verify the recipe belongs to this workspace
  const recipe = await prisma.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const logs = await prisma.recipeEditLog.findMany({
    where: { recipeId: id },
    orderBy: { editedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ logs });
}
