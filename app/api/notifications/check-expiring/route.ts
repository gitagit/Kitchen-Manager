import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * POST /api/notifications/check-expiring
 *
 * Checks for items expiring within 2 days across all workspaces
 * and sends push notifications to users who have registered tokens.
 *
 * Intended to be called by a cron job (e.g. Vercel Cron, daily at 9am).
 * Protected by a shared secret in the Authorization header.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const twoDaysOut = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const now = new Date();

  // Find items expiring within 2 days, grouped by workspace
  const expiringBatches = await prisma.itemBatch.findMany({
    where: {
      expiresOn: { gte: now, lte: twoDaysOut },
    },
    include: {
      item: { select: { name: true, workspaceId: true } },
    },
  });

  // Group by workspace
  const byWorkspace = new Map<string, string[]>();
  for (const batch of expiringBatches) {
    const wsId = batch.item.workspaceId;
    if (!byWorkspace.has(wsId)) byWorkspace.set(wsId, []);
    const list = byWorkspace.get(wsId)!;
    if (!list.includes(batch.item.name)) list.push(batch.item.name);
  }

  let sent = 0;

  for (const [workspaceId, itemNames] of byWorkspace) {
    // Get push tokens for this workspace
    const tokens = await prisma.pushToken.findMany({
      where: { workspaceId },
      select: { token: true },
    });

    if (tokens.length === 0) continue;

    const title = "Items expiring soon";
    const body = itemNames.length <= 3
      ? `${itemNames.join(", ")} expiring in the next 2 days`
      : `${itemNames.slice(0, 3).join(", ")} and ${itemNames.length - 3} more expiring soon`;

    // Send via Expo Push API
    const messages = tokens.map(t => ({
      to: t.token,
      sound: "default" as const,
      title,
      body,
      data: { type: "expiring_items" },
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });
      sent += messages.length;
    } catch {
      // Best-effort — log but don't fail
      console.error(`Failed to send push to workspace ${workspaceId}`);
    }
  }

  return NextResponse.json({ checked: byWorkspace.size, sent });
}
