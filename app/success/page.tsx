"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MINCHO =
  "var(--font-noto-serif-jp), 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif";

const STORAGE_KEY = "oys_pending_story";

type PendingStory = {
  title: string;
  content: string;
  categoryId: string;
  categoryLabel: string;
  accent: string;
};


function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [story, setStory] = useState<PendingStory | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("不正なアクセスです。");
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setError("物語データが見つかりません。ブラウザの戻るボタンで戻り、再度お試しください。");
        return;
      }
      const data = JSON.parse(raw) as PendingStory;
      setStory(data);
    } catch {
      setError("データの読み込みに失敗しました。");
    }
  }, [sessionId]);

  const saveToBookshelf = (s: PendingStory) => {
    try {
      const existing = JSON.parse(localStorage.getItem("oys_stories") ?? "[]");
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: s.title,
        content: s.content,
        categoryId: s.categoryId,
        savedAt: Date.now(),
      };
      localStorage.setItem("oys_stories", JSON.stringify([entry, ...existing]));
    } catch {}
  };

  const download = async () => {
    if (!story) return;
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: story.title,
          story: story.content,
          category: story.categoryLabel,
          categoryId: story.categoryId,
        }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${story.title || "only-your-story"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("PDFの生成に失敗しました。時間をおいて再度お試しください。");
      return;
    }
    saveToBookshelf(story);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setDownloaded(true);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0e0a06", color: "#c8b8a8",
      fontFamily: MINCHO, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem",
    }}>
      <div style={{ maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "2.5rem" }}>
        <div style={{ fontSize: "0.5rem", letterSpacing: "0.5em", color: "#3a2818", fontFamily: "'Courier New',monospace" }}>
          ONLY YOUR STORY
        </div>

        {error ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#8a6050", fontSize: "0.82rem", lineHeight: 2, letterSpacing: "0.08em" }}>{error}</p>
            <a href="/" style={{ display: "inline-block", marginTop: "2rem", color: "#6a5030", fontSize: "0.68rem", fontFamily: MINCHO, letterSpacing: "0.1em" }}>← トップに戻る</a>
          </div>
        ) : !story ? (
          <div style={{ color: "#4a3828", fontSize: "0.75rem", letterSpacing: "0.1em" }}>読み込み中…</div>
        ) : (
          <>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              <div style={{ writingMode: "vertical-rl", fontSize: "0.88rem", color: "#c8a87a", margin: "0 auto", letterSpacing: "0.18em", height: 120, display: "flex", alignItems: "center", justifyContent: "center", textShadow: "0 0 20px rgba(200,168,122,0.3)" }}>
                ご支援ありがとうございます
              </div>
              <p style={{ fontSize: "0.72rem", color: "#6a5848", lineHeight: 2, letterSpacing: "0.08em" }}>
                あなたの物語が永遠に刻まれました。<br />
                下のボタンからダウンロードしてください。
              </p>
            </div>

            <div style={{ background: "rgba(200,168,122,0.04)", border: "1px solid rgba(200,168,122,0.15)", padding: "1.2rem 1.5rem", width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: "0.78rem", color: "#c8a87a", letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
                {story.title || "（無題）"}
              </div>
              <div style={{ fontSize: "0.6rem", color: "#5a4838", letterSpacing: "0.08em" }}>{story.categoryLabel}</div>
            </div>

            {!downloaded ? (
              <button onClick={download} style={{
                background: "#c8a87a", border: "none", color: "#1a0e04",
                padding: "1rem 2.5rem", fontFamily: MINCHO, fontSize: "0.8rem",
                letterSpacing: "0.2em", fontWeight: 700,
                boxShadow: "0 0 24px rgba(200,168,122,0.4)",
                cursor: "pointer", width: "100%",
              }}>
                PDFとして保存する
              </button>
            ) : (
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ color: "#c8a87a", fontSize: "0.8rem", letterSpacing: "0.1em" }}>✦ ダウンロード完了</div>
                <a href="/" style={{ color: "#5a4838", fontSize: "0.68rem", fontFamily: MINCHO, letterSpacing: "0.1em" }}>別の物語を読む →</a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0e0a06", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#4a3828", fontFamily: "serif", fontSize: "0.75rem", letterSpacing: "0.1em" }}>読み込み中…</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
