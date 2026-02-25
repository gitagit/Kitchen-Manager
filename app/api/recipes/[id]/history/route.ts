import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

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
