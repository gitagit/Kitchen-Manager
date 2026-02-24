import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// GET: return current workspace info + members
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  return NextResponse.json({ workspace });
}

// POST: create a new workspace and make the caller the OWNER
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Block if user already has a workspace
  if (session.user.workspaceId) {
    return NextResponse.json({ error: "Already in a workspace" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name.trim(),
      members: {
        create: { userId: session.user.id, role: "OWNER" },
      },
    },
  });

  // Create default UserPreferences for this workspace
  await prisma.userPreferences.create({
    data: { workspaceId: workspace.id },
  });

  return NextResponse.json({ workspaceId: workspace.id });
}
