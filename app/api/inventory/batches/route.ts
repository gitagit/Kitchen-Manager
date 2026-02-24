import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const EMPTY_VALUES = new Set(["", "0", "none", "nothing", "empty"]);

export async function PATCH(req: Request) {
  const body = await req.json();
  const parsed = z.object({
    batchId: z.string().min(1),
    quantityText: z.string(),
  }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { batchId, quantityText } = parsed.data;

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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await prisma.itemBatch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
