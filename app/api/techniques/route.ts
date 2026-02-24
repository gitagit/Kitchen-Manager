import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional()
});

const UpdateComfortSchema = z.object({
  id: z.string().min(1),
  comfort: z.number().int().min(0).max(3)
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const techniques = await prisma.technique.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: {
      recipes: {
        include: {
          recipe: { select: { id: true, title: true } }
        }
      }
    }
  });
  return NextResponse.json({ techniques });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();

  // Check if this is a comfort update
  if (body.id && body.comfort !== undefined) {
    const parsed = UpdateComfortSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // Verify the technique belongs to this workspace
    const existing = await prisma.technique.findUnique({ where: { id: parsed.data.id } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.technique.update({
      where: { id: parsed.data.id },
      data: { comfort: parsed.data.comfort }
    });
    return NextResponse.json({ technique: updated });
  }

  // Otherwise, create new technique
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const normalized = normName(data.name);

  const technique = await prisma.technique.upsert({
    where: { workspaceId_name: { workspaceId, name: normalized } },
    update: {
      description: data.description ?? undefined,
      difficulty: data.difficulty ?? undefined
    },
    create: {
      workspaceId,
      name: normalized,
      description: data.description ?? null,
      difficulty: data.difficulty ?? 2,
      comfort: 0
    }
  });

  return NextResponse.json({ technique });
}
