import { prisma } from "@/lib/db";

// Per-workspace daily limits (configurable via env vars)
// Set AI_DAILY_LIMIT_GENERATE=0 or AI_DAILY_LIMIT_CAPTURE=0 to disable that endpoint entirely
const LIMITS = {
  generate: parseInt(process.env.AI_DAILY_LIMIT_GENERATE || "10"),
  capture:  parseInt(process.env.AI_DAILY_LIMIT_CAPTURE  || "20"),
} as const;

type Endpoint = keyof typeof LIMITS;

/** Returns true if the workspace is under its daily limit for the given endpoint. */
export async function checkAiLimit(workspaceId: string, endpoint: Endpoint): Promise<boolean> {
  const limit = LIMITS[endpoint];
  if (limit === 0) return false; // 0 = disabled
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await prisma.aiUsage.count({
    where: { workspaceId, endpoint, calledAt: { gte: since } },
  });
  return count < limit;
}

/** Records a successful AI call. Call this after the Anthropic response is received. */
export async function recordAiCall(workspaceId: string, endpoint: Endpoint): Promise<void> {
  await prisma.aiUsage.create({ data: { workspaceId, endpoint } });
}

export function getAiLimit(endpoint: Endpoint): number {
  return LIMITS[endpoint];
}
