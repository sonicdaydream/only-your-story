import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CATEGORIES } from "@/lib/categories";

const ALLOWED_IDS = new Set(CATEGORIES.map((c) => c.id));

export async function POST(req: NextRequest) {
  try {
    const { title, content, categoryId } = await req.json();

    if (!ALLOWED_IDS.has(categoryId)) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("stories")
      .insert({
        title: title ?? "",
        content,
        category: categoryId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[/api/share] supabase error:", error);
      return NextResponse.json({ error: "Failed to save story" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[/api/share]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
