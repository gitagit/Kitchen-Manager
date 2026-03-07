import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/mobile-auth";

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = auth;

  const items = await prisma.groceryItem.findMany({
    where: { acquired: false, workspaceId }
  });

  if (items.length === 0) {
    return NextResponse.json({ cartUrl: null, fallbackText: null, error: "No items in list" }, { status: 400 });
  }

  const INSTACART_API_KEY = process.env.INSTACART_API_KEY;

  // Fallback when no API key: return formatted text for copy-paste
  if (!INSTACART_API_KEY) {
    const fallbackText = items
      .map(i => i.quantityText ? `${i.quantityText} ${i.name}` : i.name)
      .join("\n");
    return NextResponse.json({ cartUrl: null, fallbackText });
  }

  const line_items = items.map(item => ({
    name: item.name,
    quantity: 1,
  }));

  const body: Record<string, unknown> = {
    title: "Mise en App Grocery List",
    line_items,
    expires_in: 86400,
  };

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (baseUrl) {
    body.partner_linkback_url = `${baseUrl}/grocery`;
  }

  let res: Response;
  try {
    res = await fetch("https://connect.instacart.com/idp/v1/products/products_link", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${INSTACART_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: "Failed to reach Instacart" }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Instacart API error", res.status, text);
    return NextResponse.json({ error: "Instacart API error" }, { status: 502 });
  }

  const data = await res.json();
  const cartUrl: string | null = data.products_link_url ?? data.url ?? null;

  return NextResponse.json({ cartUrl });
}
