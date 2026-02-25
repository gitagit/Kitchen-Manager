import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CreateItemSchema, CreateBatchSchema } from "@/app/api/_shared";
import { normName } from "@/lib/normalize";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const items = await prisma.item.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
    include: { batches: { orderBy: { createdAt: "desc" } } }
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();

  const schema = z.object({
    item: CreateItemSchema,
    batch: CreateBatchSchema.partial().extend({ quantityText: z.string().min(1) }).optional()
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { item, batch } = parsed.data;

  const name = normName(item.name);

  const upserted = await prisma.item.upsert({
    where: { workspaceId_name: { workspaceId, name } },
    update: {
      category: item.category,
      location: item.location,
      staple: item.staple ?? undefined,
      parLevel: item.parLevel ?? undefined,
      defaultCostCents: item.defaultCostCents ?? undefined
    },
    create: {
      workspaceId,
      name,
      category: item.category,
      location: item.location,
      staple: item.staple ?? false,
      parLevel: item.parLevel ?? null,
      defaultCostCents: item.defaultCostCents ?? null,
      lastConfirmed: new Date()
    }
  });

  if (batch?.quantityText) {
    await prisma.itemBatch.create({
      data: {
        itemId: upserted.id,
        quantityText: batch.quantityText,
        expiresOn: batch.expiresOn ? new Date(batch.expiresOn) : null,
        purchasedOn: batch.purchasedOn ? new Date(batch.purchasedOn) : new Date(),
        costCents: batch.costCents ?? null
      }
    });
  }

  return NextResponse.json({ item: upserted });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const body = await req.json();

  const schema = z.object({
    id: z.string().min(1),
    item: CreateItemSchema.partial().extend({ name: z.string().min(1) }),
    batch: z.object({
      id: z.string().optional(),
      quantityText: z.string().min(1),
      costCents: z.number().int().nonnegative().optional()
    }).optional()
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, item, batch } = parsed.data;

  const name = normName(item.name);

  const updated = await prisma.item.update({
    where: { id, workspaceId },
    data: {
      name,
      category: item.category,
      location: item.location,
      staple: item.staple ?? undefined,
      parLevel: item.parLevel ?? undefined,
      defaultCostCents: item.defaultCostCents ?? undefined
    }
  });

  // Update existing batch or create new one
  if (batch) {
    if (batch.id) {
      await prisma.itemBatch.update({
        where: { id: batch.id },
        data: {
          quantityText: batch.quantityText,
          costCents: batch.costCents ?? null
        }
      });
    } else {
      await prisma.itemBatch.create({
        data: {
          itemId: id,
          quantityText: batch.quantityText,
          costCents: batch.costCents ?? null
        }
      });
    }
  }

  return NextResponse.json({ item: updated });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const item = await prisma.item.update({
    where: { id, workspaceId },
    data: { lastConfirmed: new Date() },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  // Verify item belongs to this workspace before deleting
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item || item.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete batches first, then the item
  await prisma.itemBatch.deleteMany({ where: { itemId: id } });
  await prisma.item.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
