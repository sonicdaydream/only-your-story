import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED_IDS = new Set(CATEGORIES.map((c) => c.id));

export async function POST(req: NextRequest) {
  try {
    const { categoryId } = await req.json();

    if (!ALLOWED_IDS.has(categoryId)) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }

    const category = CATEGORIES.find((c) => c.id === categoryId)!;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: category.system,
      messages: [{ role: "user", content: category.prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
