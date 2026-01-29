import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { normName } from "@/lib/normalize";

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
  const techniques = await prisma.technique.findMany({
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
  const body = await req.json();
  
  // Check if this is a comfort update
  if (body.id && body.comfort !== undefined) {
    const parsed = UpdateComfortSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    
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
    where: { name: normalized },
    update: {
      description: data.description ?? undefined,
      difficulty: data.difficulty ?? undefined
    },
    create: {
      name: normalized,
      description: data.description ?? null,
      difficulty: data.difficulty ?? 2,
      comfort: 0
    }
  });

  return NextResponse.json({ technique });
}
