import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/mobile-auth";

const EMPTY_VALUES = new Set(["", "0", "none", "nothing", "empty"]);

export async function PATCH(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const body = await req.json();
  const parsed = z.object({
    batchId: z.string().min(1),
    quantityText: z.string(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { batchId, quantityText } = parsed.data;

  // Verify the batch's item belongs to this workspace
  const existing = await prisma.itemBatch.findUnique({ where: { id: batchId }, include: { item: true } });
  if (!existing || existing.item.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (EMPTY_VALUES.has(quantityText.trim().toLowerCase())) {
    await prisma.itemBatch.delete({ where: { id: batchId } });
    return NextResponse.json({ deleted: true });
  }

  const batch = await prisma.itemBatch.update({
    where: { id: batchId },
    data: { quantityText },
  });
  return NextResponse.json({ batch });
}

export async function DELETE(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Verify the batch's item belongs to this workspace
  const existing = await prisma.itemBatch.findUnique({ where: { id }, include: { item: true } });
  if (!existing || existing.item.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.itemBatch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
