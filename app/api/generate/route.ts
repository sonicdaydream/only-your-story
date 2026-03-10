import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "@/lib/categories";

// API Routes ではサービスロールキーを使用（RLSをバイパスしてINSERT/SELECTを確実に行う）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/** GET: IPベースの本日の生成数を返す */
export async function GET(req: NextRequest) {
  try {
    const ip = getIp(req);
    console.log("[GET /api/generate] ip:", ip);
    const { count, error } = await supabase
      .from("generation_logs")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("generated_at", getJSTDayStartUTC());
    if (error) console.error("[GET /api/generate] SELECT error:", error);
    const used = count ?? 0;
    console.log("[GET /api/generate] used:", used);
    return NextResponse.json({ used, remaining: Math.max(0, DAILY_LIMIT - used) });
  } catch (err) {
    console.error("[GET /api/generate] exception:", err);
    return NextResponse.json({ used: 0, remaining: DAILY_LIMIT });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { categoryId } = await req.json();

    if (!ALLOWED_IDS.has(categoryId)) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }

    const ip = getIp(req);
    console.log("IP address: " + ip);
    console.log("[POST /api/generate] categoryId:", categoryId);
    console.log("[POST /api/generate] SERVICE_ROLE_KEY set:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // IP別の当日生成数チェック
    const { count, error: countError } = await supabase
      .from("generation_logs")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("generated_at", getJSTDayStartUTC());

    if (countError) console.error("[POST /api/generate] SELECT error:", JSON.stringify(countError));
    console.log("[POST /api/generate] today count:", count);

    if ((count ?? 0) >= DAILY_LIMIT) {
      console.log("[POST /api/generate] limit reached for ip:", ip);
      return NextResponse.json({ error: "limit_reached" }, { status: 429 });
    }

    const category = CATEGORIES.find((c) => c.id === categoryId)!;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: category.system,
      messages: [{ role: "user", content: category.getPrompt() }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // 生成ログを記録
    const { data: insertData, error: insertError } = await supabase
      .from("generation_logs")
      .insert({ ip_address: ip })
      .select();
    console.log("Supabase insert result: " + JSON.stringify(insertData));
    if (insertError) {
      console.error("Supabase insert error: " + JSON.stringify(insertError));
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
