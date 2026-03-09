import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// Vercel Cron Jobs または手動呼び出し用
// last_read_at（未読の場合は created_at）が30日以上前の物語を削除する
//
// ※ 事前に Supabase SQL Editor で以下を実行してください:
// CREATE OR REPLACE FUNCTION cleanup_expired_stories()
// RETURNS integer AS $$
// DECLARE
//   deleted_count integer;
// BEGIN
//   WITH deleted AS (
//     DELETE FROM stories
//     WHERE COALESCE(last_read_at, created_at) < NOW() - INTERVAL '30 days'
//     RETURNING id
//   )
//   SELECT COUNT(*) INTO deleted_count FROM deleted;
//   RETURN deleted_count;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;

export async function GET(req: NextRequest) {
  // Vercel Cron からの呼び出しであることを確認
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  const { data, error } = await db.rpc("cleanup_expired_stories");

  if (error) {
    console.error("[/api/cleanup] supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = data as number;
  console.log(`[/api/cleanup] deleted ${count} stories`);
  return NextResponse.json({ deleted: count });
}
