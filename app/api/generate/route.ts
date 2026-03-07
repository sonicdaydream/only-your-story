import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";
import { supabase } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const ALLOWED_IDS = new Set(CATEGORIES.map((c) => c.id));
const DAILY_LIMIT = 5;

/** 現在の日本時間の日の開始をUTC ISO文字列で返す */
function getJSTDayStartUTC(): string {
  const jstMs = Date.now() + 9 * 60 * 60 * 1000;
  const jst = new Date(jstMs);
  const dayStartMs =
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) -
    9 * 60 * 60 * 1000;
  return new Date(dayStartMs).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const { categoryId } = await req.json();

    if (!ALLOWED_IDS.has(categoryId)) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "127.0.0.1";

    // IP別の当日生成数チェック（失敗時はスルーして生成を許可）
    const { count } = await supabase
      .from("generation_logs")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("generated_at", getJSTDayStartUTC());

    if ((count ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json({ error: "limit_reached" }, { status: 429 });
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

    // 生成ログを記録（非同期・失敗しても無視）
    supabase.from("generation_logs").insert({ ip }).then(() => {});

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
