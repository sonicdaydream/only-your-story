import { notFound } from "next/navigation";
import { supabase, type SharedStory } from "@/lib/supabase";
import { getCategoryById, DEFAULT_THEME } from "@/lib/categories";
import { AdUnit } from "@/components/AdUnit";
import type { Metadata } from "next";

const MINCHO =
  "var(--font-noto-serif-jp), 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { data } = await supabase
    .from("stories")
    .select("title, category")
    .eq("id", id)
    .single();

  if (!data) return { title: "Only Your Story" };
  return {
    title: `${data.title || "物語"} — Only Your Story`,
    description: "AIが生成した、この世界に一つだけの物語。",
  };
}

function calcDaysLeft(story: SharedStory): number {
  const base = story.last_read_at ?? story.created_at;
  const expiresAt = new Date(base).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function StoryPage({ params }: Props) {
  const { id } = await params;

  const { data: story, error } = await supabase
    .from("stories")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !story) notFound();

  const s = story as SharedStory;

  // read_count +1 と last_read_at 更新を原子的に実行（非同期・待たない）
  // 事前に Supabase で increment_read_count RPC を作成する必要あり
  supabase.rpc("increment_read_count", { story_id: id }).then(() => {});

  const cat = getCategoryById(s.category);
  const t = cat?.theme ?? DEFAULT_THEME;

  const createdDate = new Date(s.created_at).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 削除予告（更新前の last_read_at を基準にした残り日数）
  const daysLeft = calcDaysLeft(s);
  const isUrgent = daysLeft <= 7;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: MINCHO,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* グロー */}
      <div
        style={{
          position: "fixed",
          top: "35%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: `${t.accent}12`,
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.2rem 1.5rem 0",
          }}
        >
          <a
            href="/"
            style={{
              background: "transparent",
              border: "none",
              color: t.textMuted,
              fontSize: "0.65rem",
              fontFamily: MINCHO,
              letterSpacing: "0.1em",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            ← Only Your Story
          </a>
          <div
            style={{
              fontSize: "0.62rem",
              color: t.accent,
              fontFamily: "'Courier New',monospace",
              letterSpacing: "0.15em",
            }}
          >
            {cat?.label ?? s.category}
          </div>
        </div>

        <div
          style={{
            height: 1,
            background: `linear-gradient(to right,transparent,${t.accent}40,transparent)`,
            margin: "0.8rem 1.5rem 0",
          }}
        />

        {/* タイトル */}
        {s.title && (
          <div style={{ padding: "1rem 1.5rem 0", display: "flex", justifyContent: "center" }}>
            <div
              style={{
                writingMode: "vertical-rl",
                fontSize: "1.1rem",
                fontWeight: 400,
                color: t.accent,
                letterSpacing: "0.2em",
                textShadow: `0 0 20px ${t.accent}40`,
              }}
            >
              {s.title}
            </div>
          </div>
        )}

        {/* 本文 */}
        <div
          style={{
            flex: 1,
            padding: "1.5rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              height: "calc(100vh - 200px)",
              maxHeight: 580,
              overflowX: "auto",
              overflowY: "hidden",
              fontSize: "1rem",
              lineHeight: 2.2,
              letterSpacing: "0.12em",
              whiteSpace: "pre-wrap",
              fontFamily: MINCHO,
              fontWeight: 300,
              color: t.text,
              background: t.paperBg,
              padding: "0.8rem 1.2rem",
              borderLeft: `1px solid ${t.accent}20`,
              borderRight: `1px solid ${t.accent}10`,
            }}
          >
            {s.content}
          </div>
        </div>

        {/* 削除予告 */}
        <div
          style={{
            margin: "0 1.5rem",
            padding: "0.5rem 0.8rem",
            borderLeft: `2px solid ${isUrgent ? "#cc2200" : t.accent}40`,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.6rem",
              color: isUrgent ? "#cc4422" : t.textMuted,
              fontFamily: MINCHO,
              letterSpacing: "0.1em",
              lineHeight: 1.8,
            }}
          >
            {daysLeft <= 0
              ? "この物語はまもなく朽ちます"
              : isUrgent
              ? `あと ${daysLeft} 日で、この物語は朽ちます`
              : `読まれなければ、あと ${daysLeft} 日で朽ちます`}
            {isUrgent && daysLeft > 0 && (
              <span
                style={{
                  display: "block",
                  fontSize: "0.55rem",
                  color: `${t.textMuted}`,
                  marginTop: "0.2rem",
                }}
              >
                — 読むたびに、30日延命される
              </span>
            )}
          </span>
        </div>

        {/* 広告枠 */}
        <AdUnit />

        {/* 投げ銭リンク */}
        <div style={{ margin: "1rem 1.5rem 0", textAlign: "center" }}>
          <a
            href="https://buymeacoffee.com/rockworks"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.68rem",
              color: t.textMuted,
              fontFamily: MINCHO,
              letterSpacing: "0.1em",
              textDecoration: "none",
              border: `1px solid ${t.accent}25`,
              padding: "0.6rem 1.2rem",
              display: "inline-block",
              transition: "color 0.2s, border-color 0.2s",
            }}
          >
            ☕ この物語を気に入ったら応援してね
          </a>
        </div>

        {/* フッター */}
        <div
          style={{
            padding: "0.8rem 1.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.8rem",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.6rem",
              color: t.textMuted,
              letterSpacing: "0.12em",
              textAlign: "center",
              lineHeight: 2,
            }}
          >
            {createdDate}に生まれた物語
          </div>
          <a
            href="/"
            style={{
              background: t.accent,
              border: "none",
              color: "#000",
              padding: "0.85rem 2rem",
              fontFamily: MINCHO,
              fontSize: "0.75rem",
              letterSpacing: "0.2em",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-block",
              boxShadow: `0 0 18px ${t.accent}40`,
            }}
          >
            自分だけの物語を読む
          </a>
        </div>
      </div>
    </div>
  );
}
