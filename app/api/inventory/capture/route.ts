import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkAiLimit, recordAiCall, getAiLimit } from "@/lib/ai-limiter";

export const maxDuration = 60; // Vision API with multiple images can take 20-60s

const VALID_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ValidMediaType = typeof VALID_MEDIA_TYPES[number];

export async function POST(req: Request) {
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

  const prompt = `You are analyzing kitchen, pantry, or refrigerator photos to extract a list of food items.

Look at all provided images carefully and identify every food item, ingredient, or pantry staple you can clearly see.

For each item determine:
- name: lowercase, specific (e.g. "olive oil", "canned chickpeas", "frozen peas", "sharp cheddar")
- category: exactly one of PANTRY, SPICE, FROZEN, PRODUCE, MEAT, DAIRY, CONDIMENT, BAKING, BEVERAGE, OTHER
- location: exactly one of PANTRY, FRIDGE, FREEZER, COUNTER, OTHER (infer from item type and image context)
- quantityText: best estimate (e.g. "1 bottle", "2 cans", "half full", "1 bunch", "1 block")

Category guide:
- PANTRY: canned goods, dried goods, oils, vinegar, pasta, rice, flour, sugar, nuts, broth
- SPICE: individual spices, herbs, seasoning blends, salt, pepper
- FROZEN: items clearly in a freezer or frozen packaging
- PRODUCE: fresh fruits and vegetables
- MEAT: meat, poultry, seafood (fresh or frozen)
- DAIRY: milk, cheese, yogurt, butter, cream, eggs
- CONDIMENT: ketchup, mustard, mayo, hot sauce, soy sauce, salad dressing, jam
- BAKING: baking powder, baking soda, yeast, chocolate chips, vanilla extract, cocoa
- BEVERAGE: juice, soda, water, coffee, tea, alcohol
- OTHER: anything that doesn't fit above

Location guide:
- PANTRY: shelf-stable items stored at room temperature
- FRIDGE: refrigerated items
- FREEZER: frozen items
- COUNTER: bread, fruit bowls, items sitting out
- OTHER: unclear

Return ONLY a JSON object — no markdown, no explanation:
{
  "items": [
    {
      "name": "olive oil",
      "category": "PANTRY",
      "location": "PANTRY",
      "quantityText": "1 bottle, about half full"
    }
  ]
}

Be conservative: only list items you can clearly identify. Do not guess at blurry or unclear items. Deduplicate across images.`;

  const client = new Anthropic();

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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
    return NextResponse.json({ error: err?.message ?? "Claude API error" }, { status: 502 });
  }

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response type from Claude" }, { status: 500 });
  }

  const raw = content.text.trim();
  console.log("[capture] Claude raw response:", raw.slice(0, 500));

  let jsonText = raw;
  // Strip markdown fences if present, then fall back to extracting the first {...} block
  const fenceMatch = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim();
  } else {
    const objMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objMatch) jsonText = objMatch[0];
  }

  let result: { items: unknown[] };
  try {
    result = JSON.parse(jsonText);
  } catch {
    console.error("[capture] Parse failed. Raw response:", raw);
    return NextResponse.json({
      error: `Claude returned unexpected response: "${raw.slice(0, 120)}${raw.length > 120 ? "…" : ""}"`
    }, { status: 500 });
  }

  await recordAiCall(workspaceId, "capture");
  return NextResponse.json({ items: result.items ?? [] });
}
