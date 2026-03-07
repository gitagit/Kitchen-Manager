import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/mobile-auth";

// POST: generate an invite link (OWNER only)
export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, userId } = auth;

  // Only OWNERs can invite
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (member?.role !== "OWNER") {
    return NextResponse.json({ error: "Only workspace owners can invite members" }, { status: 403 });
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invite = await prisma.workspaceInvite.create({
    data: { workspaceId, createdById: userId, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return NextResponse.json({
    code: invite.code,
    url: `${baseUrl}/join?code=${invite.code}`,
    expiresAt: invite.expiresAt,
  });
}

// GET: list active (unused, unexpired) invites for current workspace
export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const invites = await prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "asc" },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return NextResponse.json({
    invites: invites.map(i => ({
      ...i,
      url: `${baseUrl}/join?code=${i.code}`,
    })),
  });
}
