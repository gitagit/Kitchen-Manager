import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAiLimit, recordAiCall, getAiLimit } from "@/lib/ai-limiter";
import { Logger } from "next-axiom";

export const maxDuration = 60; // Vision API with multiple images can take 20-60s

const VALID_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ValidMediaType = typeof VALID_MEDIA_TYPES[number];

export async function POST(req: Request) {
  const log = new Logger({ source: "capture" });

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId } = session.user;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 403 });

  const allowed = await checkAiLimit(workspaceId, "capture");
  if (!allowed) {
    return NextResponse.json(
      { error: `Daily inventory scan limit reached (${getAiLimit("capture")}/day). Try again tomorrow.` },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const files = formData.getAll("images") as File[];
  if (!files.length) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }
  log.info("capture started", { workspaceId, imageCount: files.length });
  if (files.length > 5) {
    return NextResponse.json({ error: "Maximum 5 images per scan" }, { status: 400 });
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const oversized = files.filter(f => f.size > MAX_FILE_SIZE).map(f => f.name);
  if (oversized.length > 0) {
    return NextResponse.json(
      { error: `File(s) exceed the 5 MB limit: ${oversized.join(", ")}` },
      { status: 400 }
    );
  }

  // Build image content blocks for Claude
  const imageBlocks: Anthropic.ImageBlockParam[] = [];
  for (const file of files) {
    const mediaType = file.type as ValidMediaType;
    if (!VALID_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    imageBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 }
    });
  }

  const prompt = `Analyze these kitchen, pantry, or refrigerator photos and identify every food item, ingredient, or pantry staple you can clearly see.

For each item use:
- name: lowercase, specific (e.g. "olive oil", "canned chickpeas", "frozen peas", "sharp cheddar")
- category: PANTRY | SPICE | FROZEN | PRODUCE | MEAT | DAIRY | CONDIMENT | BAKING | BEVERAGE | OTHER
  - PANTRY: canned goods, dried goods, oils, vinegar, pasta, rice, flour, sugar, nuts, broth
  - SPICE: individual spices, herbs, seasoning blends, salt, pepper
  - CONDIMENT: ketchup, mustard, mayo, hot sauce, soy sauce, salad dressing, jam
  - DAIRY: milk, cheese, yogurt, butter, cream, eggs
  - BAKING: baking powder, baking soda, yeast, chocolate chips, vanilla extract, cocoa
- location: PANTRY | FRIDGE | FREEZER | COUNTER | OTHER (infer from context)
- quantityText: best estimate (e.g. "1 bottle", "2 cans", "half full", "1 bunch")

Be conservative — only report items you can clearly identify. Deduplicate across images.`;

  const client = new Anthropic();

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      tools: [
        {
          name: "report_inventory_items",
          description: "Report all food items identified in the provided kitchen/pantry/fridge photos.",
          input_schema: {
            type: "object" as const,
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name:         { type: "string", description: "Lowercase specific item name" },
                    category:     { type: "string", enum: ["PANTRY","SPICE","FROZEN","PRODUCE","MEAT","DAIRY","CONDIMENT","BAKING","BEVERAGE","OTHER"] },
                    location:     { type: "string", enum: ["PANTRY","FRIDGE","FREEZER","COUNTER","OTHER"] },
                    quantityText: { type: "string", description: "Best estimate of quantity" }
                  },
                  required: ["name", "category", "location", "quantityText"]
                }
              }
            },
            required: ["items"]
          }
        }
      ],
      tool_choice: { type: "tool", name: "report_inventory_items" },
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: prompt }
          ]
        }
      ]
    });
  } catch (err: any) {
    log.error("Claude API error", { workspaceId, error: err?.message });
    await log.flush();
    return NextResponse.json({ error: err?.message ?? "Claude API error" }, { status: 502 });
  }

  const toolUse = message.content.find(c => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    log.error("No tool response from Claude", { workspaceId });
    await log.flush();
    return NextResponse.json({ error: "No tool response from Claude" }, { status: 500 });
  }

  const result = toolUse.input as { items: unknown[] };
  const itemCount = (result.items ?? []).length;
  log.info("capture complete", { workspaceId, itemCount });

  await recordAiCall(workspaceId, "capture");
  await log.flush();
  return NextResponse.json({ items: result.items ?? [] });
}
