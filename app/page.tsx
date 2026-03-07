"use client";

import { useState, useEffect } from "react";
import { CATEGORIES, CONCEPT_SECTIONS, DEFAULT_THEME, type Category } from "@/lib/categories";
import { handleSave } from "@/lib/save-handler";

const MINCHO = "var(--font-noto-serif-jp), 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif";

const LOADING_MSGS = [
  "物語を紡いでいます…",
  "墨が乾くまでお待ちください…",
  "あなただけの頁を生成中…",
  "この物語はまだ誰も読んでいません…",
];

const DAILY_LIMIT = 5;
const GEN_KEY = "oys_gen";

function getJSTDateStr(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}-${String(jst.getUTCDate()).padStart(2, "0")}`;
}

function loadGenCount(): number {
  try {
    const raw = localStorage.getItem(GEN_KEY);
    if (!raw) return 0;
    const { d, c } = JSON.parse(raw);
    return d === getJSTDateStr() ? (c ?? 0) : 0;
  } catch { return 0; }
}

function saveGenCount(count: number) {
  try {
    localStorage.setItem(GEN_KEY, JSON.stringify({ d: getJSTDateStr(), c: count }));
  } catch {}
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}

type Screen = "concept" | "select" | "reading" | "shelf";

type SavedStory = {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  savedAt: number;
};

const STORAGE_KEY = "oys_stories";

function loadSavedStories(): SavedStory[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistStories(stories: SavedStory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  } catch {}
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("concept");
  const [conceptPage, setConceptPage] = useState(0);
  const [conceptVisible, setConceptVisible] = useState(true);

  const [cat, setCat] = useState<Category | null>(null);
  const [story, setStory] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [showShare, setShowShare] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const remaining = DAILY_LIMIT - genCount;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [shelfStory, setShelfStory] = useState<SavedStory | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  const t = cat?.theme ?? DEFAULT_THEME;

  // 初回訪問チェック + 保存済み物語ロード
  useEffect(() => {
    try {
      if (localStorage.getItem("oys_visited")) setScreen("select");
    } catch {}
    setSavedStories(loadSavedStories());
    setGenCount(loadGenCount());
  }, []);

  const downloadPdf = async (s: SavedStory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadingIds.has(s.id)) return;
    setDownloadingIds(prev => new Set(prev).add(s.id));
    try {
      const categoryLabel = CATEGORIES.find(c => c.id === s.categoryId)?.label ?? s.categoryId;
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: s.title, story: s.content, category: categoryLabel, categoryId: s.categoryId }),
      });
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.title || "story"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloadingIds(prev => { const next = new Set(prev); next.delete(s.id); return next; });
    }
  };

  const deleteFromLocal = (id: string) => {
    const updated = savedStories.filter(s => s.id !== id);
    persistStories(updated);
    setSavedStories(updated);
  };


  const goConceptPage = (dir: "next" | "prev") => {
    setConceptVisible(false);
    setTimeout(() => {
      setConceptPage(p => dir === "next" ? p + 1 : p - 1);
      setConceptVisible(true);
    }, 250);
  };

  const finishConcept = () => {
    try { localStorage.setItem("oys_visited", "1"); } catch {}
    setScreen("select");
  };

  const generate = async (c: Category) => {
    setCat(c);
    setScreen("reading");
    setLoading(true);
    setStory("");
    setTitle("");
    setError("");
    setShared(false);
    setShareUrl("");

    let idx = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    const mi = setInterval(() => {
      idx = (idx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[idx]);
    }, 1400);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: c.id }),
      });
      clearInterval(mi);
      if (res.status === 429) {
        setGenCount(DAILY_LIMIT);
        saveGenCount(DAILY_LIMIT);
        setError("本日の生成上限に達しました。明日またお越しください。");
        return;
      }
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const raw: string = data.text ?? "";
      const lines = raw.split("\n");
      let parsedTitle = "";
      let bodyStart = 0;
      if (lines[0]?.startsWith("TITLE:")) {
        parsedTitle = lines[0].replace("TITLE:", "").trim();
        bodyStart = lines[1] === "---" ? 2 : 1;
      }
      setTitle(parsedTitle);
      setStory(stripMarkdown(lines.slice(bodyStart).join("\n")));
      const next = loadGenCount() + 1;
      setGenCount(next);
      saveGenCount(next);
    } catch {
      clearInterval(mi);
      setError("生成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const sec = CONCEPT_SECTIONS[conceptPage] ?? CONCEPT_SECTIONS[0];

  const buildShareText = (url: string) =>
    cat
      ? `「Only Your Story」で${cat.label}の物語を読みました。\n${title ? `「${title}」\n` : ""}シェアするまで世界に存在しなかった物語。\n\n${url}\n\n#OnlyYourStory`
      : "";

  const publishStory = async (): Promise<string> => {
    if (shareUrl) return shareUrl;
    setShareLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: story, categoryId: cat?.id }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const url = `${window.location.origin}/story/${data.id}`;
      setShareUrl(url);
      return url;
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: screen === "concept" ? "#080604" : t.bg,
      color: screen === "concept" ? "#d8cdb8" : t.text,
      fontFamily: MINCHO,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 1.2s, color 0.6s",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* 背景グロー */}
      {cat && screen !== "concept" && (
        <div style={{
          position: "fixed", top: "35%", left: "50%",
          transform: "translateX(-50%)",
          width: 250, height: 250, borderRadius: "50%",
          background: `${cat.theme.accent}15`,
          filter: "blur(70px)", pointerEvents: "none",
          animation: "pulse-glow 4s ease-in-out infinite",
        }} />
      )}

      {/* ━━━ CONCEPT ━━━ */}
      {screen === "concept" && (
        <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 1.8rem 0" }}>
            <div style={{ fontSize: "0.5rem", letterSpacing: "0.45em", color: "#3a2818", fontFamily: "'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <button onClick={finishConcept} style={{ background: "transparent", border: "none", color: "#4a3828", fontSize: "0.6rem", fontFamily: MINCHO, letterSpacing: "0.12em", cursor: "pointer" }}>
              スキップ →
            </button>
          </div>

          {/* プログレスバー */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "1rem 1.8rem 0", position: "relative" }}>
            <div style={{
              position: "absolute", top: 0, left: 0, height: "100%",
              width: `${(conceptPage + 1) / CONCEPT_SECTIONS.length * 100}%`,
              background: "linear-gradient(to right,#6a5030,#c8a87a)",
              transition: "width 0.6s ease",
              boxShadow: "0 0 8px rgba(200,168,122,0.3)",
            }} />
          </div>

          <div style={{ flex: 1, padding: "2.5rem 1.8rem", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.5rem" }}>
            {/* 縦書きキャッチ */}
            <div style={{
              display: "flex", justifyContent: "center",
              opacity: conceptVisible ? 1 : 0,
              transform: conceptVisible ? "translateY(0)" : "translateY(12px)",
              transition: "opacity 0.4s, transform 0.4s",
            }}>
              <div style={{
                writingMode: "vertical-rl", fontSize: "1.1rem", fontWeight: 400,
                lineHeight: 1.9, color: "#c8a87a", letterSpacing: "0.18em",
                height: 200, display: "flex", alignItems: "center", justifyContent: "center",
                borderRight: "1px solid rgba(200,168,122,0.2)", paddingRight: "1.2rem",
                textShadow: "0 0 30px rgba(200,168,122,0.2)",
              }}>
                {sec.vertical}
              </div>
            </div>

            {/* 本文 */}
            <div style={{
              opacity: conceptVisible ? 1 : 0,
              transform: conceptVisible ? "translateY(0)" : "translateY(8px)",
              transition: "opacity 0.4s 0.1s, transform 0.4s 0.1s",
            }}>
              <p style={{
                fontSize: "0.8rem", lineHeight: 2.4, color: "#8a7868",
                letterSpacing: "0.08em", whiteSpace: "pre-wrap",
                borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: "1.2rem",
              }}>
                {sec.body}
              </p>
            </div>

            {/* ドットナビ */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {CONCEPT_SECTIONS.map((_, i) => (
                <button key={i} onClick={() => {
                  setConceptVisible(false);
                  setTimeout(() => { setConceptPage(i); setConceptVisible(true); }, 250);
                }} style={{
                  width: i === conceptPage ? 20 : 5, height: 4,
                  background: i === conceptPage ? "#c8a87a" : "rgba(255,255,255,0.1)",
                  border: "none", borderRadius: 2, transition: "all 0.4s",
                  boxShadow: i === conceptPage ? "0 0 8px rgba(200,168,122,0.5)" : "none",
                  padding: 0, cursor: "pointer",
                }} />
              ))}
            </div>
          </div>

          {/* ナビボタン */}
          <div style={{ padding: "0 1.8rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={() => goConceptPage("prev")} disabled={conceptPage === 0} style={{
              background: "transparent",
              border: `1px solid ${conceptPage === 0 ? "transparent" : "rgba(255,255,255,0.08)"}`,
              color: conceptPage === 0 ? "transparent" : "#6a5848",
              padding: "0.75rem 1.2rem", fontFamily: MINCHO, fontSize: "0.7rem",
              letterSpacing: "0.12em", transition: "all 0.2s", cursor: "pointer",
            }}>
              前へ
            </button>
            {conceptPage < CONCEPT_SECTIONS.length - 1 ? (
              <button onClick={() => goConceptPage("next")} style={{
                background: "transparent", border: "1px solid rgba(200,168,122,0.3)",
                color: "#c8a87a", padding: "0.75rem 1.8rem", fontFamily: MINCHO,
                fontSize: "0.7rem", letterSpacing: "0.18em", transition: "all 0.3s", cursor: "pointer",
              }}>
                次へ
              </button>
            ) : (
              <button onClick={finishConcept} style={{
                background: "#c8a87a", border: "none", color: "#1a0e04",
                padding: "0.85rem 2rem", fontFamily: MINCHO, fontSize: "0.75rem",
                letterSpacing: "0.2em", fontWeight: 700,
                boxShadow: "0 0 24px rgba(200,168,122,0.4)",
                animation: "float 3s ease-in-out infinite", cursor: "pointer",
              }}>
                物語をはじめる
              </button>
            )}
          </div>
        </div>
      )}

      {/* ━━━ SELECT ━━━ */}
      {screen === "select" && (
        <div style={{ width: "100%", maxWidth: 440, padding: "2rem 1.5rem", animation: "fadeIn 0.5s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.5em", color: "#4a3828", fontFamily: "'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
              {savedStories.length > 0 && (
                <button onClick={() => { setShelfStory(null); setScreen("shelf"); }} style={{
                  background: "transparent", border: "none", color: "#6a5030",
                  fontSize: "0.58rem", fontFamily: MINCHO, letterSpacing: "0.1em", cursor: "pointer",
                }}>
                  本棚 ({savedStories.length})
                </button>
              )}
              <button onClick={() => { setConceptPage(0); setScreen("concept"); }} style={{
                background: "transparent", border: "none", color: "#4a3828",
                fontSize: "0.58rem", fontFamily: MINCHO, letterSpacing: "0.1em", cursor: "pointer",
              }}>
                このサービスについて
              </button>
            </div>
          </div>
          <div style={{
            writingMode: "vertical-rl", fontSize: "0.88rem", fontWeight: 300,
            color: "#6a5848", margin: "0 auto 2rem", letterSpacing: "0.12em",
            height: 80, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            物語をお選びください
          </div>
          {remaining <= 0 && (
            <p style={{ fontSize: "0.7rem", color: "#8a4030", fontFamily: MINCHO, letterSpacing: "0.08em", lineHeight: 2, textAlign: "center", marginBottom: "0.8rem", padding: "0.8rem", border: "1px solid rgba(150,60,40,0.2)", background: "rgba(150,60,40,0.05)" }}>
              本日の生成上限に達しました。<br />明日またお越しください。
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {CATEGORIES.map((c, i) => (
              <button
                key={c.id}
                onClick={() => remaining > 0 && generate(c)}
                disabled={remaining <= 0}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: remaining <= 0 ? "#4a3828" : "#b0a090",
                  padding: "1rem 1.2rem", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "0.9rem",
                  fontFamily: MINCHO, transition: "all 0.22s",
                  cursor: remaining <= 0 ? "not-allowed" : "pointer",
                  opacity: remaining <= 0 ? 0.45 : 1,
                  animationDelay: `${i * 0.08}s`,
                }}
                onMouseEnter={remaining > 0 ? e => {
                  e.currentTarget.style.background = `${c.theme.accent}14`;
                  e.currentTarget.style.borderColor = `${c.theme.accent}44`;
                  e.currentTarget.style.color = c.theme.accent;
                } : undefined}
                onMouseLeave={remaining > 0 ? e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#b0a090";
                } : undefined}
              >
                <span style={{ fontSize: "0.55rem", letterSpacing: "0.3em", color: t.textMuted, fontFamily: "'Courier New',monospace", textTransform: "uppercase", minWidth: "3.5rem", flexShrink: 0 }}>
                  {c.id}
                </span>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 500, marginBottom: "0.12rem", letterSpacing: "0.08em" }}>{c.label}</div>
                  <div style={{ fontSize: "0.63rem", color: "#5a4838" }}>タップして生成する</div>
                </div>
                <span style={{ marginLeft: "auto", color: "#3a2818", fontSize: "0.7rem" }}>→</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: "1.2rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.58rem", color: remaining <= 0 ? "#8a4030" : "#4a3828", fontFamily: "'Courier New',monospace", letterSpacing: "0.15em" }}>
              {remaining <= 0 ? "LIMIT REACHED" : `本日あと${remaining}回`}
            </span>
          </div>
        </div>
      )}

      {/* ━━━ READING ━━━ */}
      {screen === "reading" && cat && (
        <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem 0" }}>
            <button onClick={() => {
              if (story && !shared) {
                setShowBackConfirm(true);
              } else {
                setScreen("select");
              }
            }} style={{ background: "transparent", border: "none", color: t.textMuted, fontSize: "0.65rem", fontFamily: MINCHO, letterSpacing: "0.1em", cursor: "pointer" }}>← 戻る</button>
            <div style={{ fontSize: "0.5rem", letterSpacing: "0.4em", color: t.textMuted, fontFamily: "'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <div style={{ fontSize: "0.62rem", color: t.accent, fontFamily: "'Courier New',monospace", letterSpacing: "0.15em" }}>{cat.label}</div>
          </div>
          <div style={{ height: 1, background: `linear-gradient(to right,transparent,${t.accent}40,transparent)`, margin: "0.8rem 1.5rem 0" }} />

          {title && !loading && (
            <div style={{ padding: "1rem 1.5rem 0", display: "flex", justifyContent: "center" }}>
              <div style={{ writingMode: "vertical-rl", fontSize: "1.1rem", fontWeight: 400, color: t.accent, letterSpacing: "0.2em", textShadow: `0 0 20px ${t.accent}40` }}>
                {title}
              </div>
            </div>
          )}

          <div style={{ flex: 1, padding: "1.5rem", display: "flex", justifyContent: "center", alignItems: loading ? "center" : "flex-start" }}>
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2rem" }}>
                <div style={{ writingMode: "vertical-rl", fontSize: "0.78rem", color: t.textMuted, letterSpacing: "0.15em", fontFamily: MINCHO, minHeight: "6rem", textAlign: "center" }}>
                  {loadingMsg}
                </div>
                <div style={{ width: 1, height: 60, background: t.accentSoft, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: "-100%", left: 0, width: "100%", height: "100%", background: t.accent, animation: "slide-vertical 1.1s ease-in-out infinite" }} />
                </div>
              </div>
            )}
            {error && !loading && (
              <div style={{ textAlign: "center" }}>
                <p style={{ color: remaining <= 0 ? "#8a4030" : t.textMuted, fontSize: "0.8rem", marginBottom: "1.5rem", lineHeight: 2, letterSpacing: "0.06em" }}>{error}</p>
                {remaining > 0 && (
                  <button onClick={() => generate(cat)} style={{ background: "transparent", border: `1px solid ${t.accentSoft}`, color: t.text, padding: "0.8rem 1.5rem", fontFamily: MINCHO, fontSize: "0.75rem", letterSpacing: "0.1em", cursor: "pointer" }}>
                    再生成する
                  </button>
                )}
              </div>
            )}
            {story && !loading && (
              <div style={{
                writingMode: "vertical-rl", textOrientation: "mixed",
                height: "calc(100vh - 200px)", maxHeight: 580,
                overflowX: "auto", overflowY: "hidden",
                fontSize: "1rem", lineHeight: 2.2, letterSpacing: "0.12em",
                whiteSpace: "pre-wrap", fontFamily: MINCHO, fontWeight: 300,
                color: t.text, background: t.paperBg,
                padding: "0.8rem 1.2rem",
                borderLeft: `1px solid ${t.accent}20`,
                borderRight: `1px solid ${t.accent}10`,
                animation: "fadeIn 1s ease",
              }}>
                {story}
              </div>
            )}
          </div>

          {story && !loading && (
            <div style={{ padding: "0.8rem 1.5rem 2rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setShowShare(true)} style={{
                  flex: 2, background: shared ? `${t.accent}30` : t.accent,
                  border: "none", color: shared ? t.accent : "#000",
                  padding: "0.9rem", fontFamily: MINCHO, fontSize: "0.75rem",
                  letterSpacing: "0.12em", fontWeight: 700,
                  boxShadow: shared ? "none" : `0 0 18px ${t.accent}40`,
                  transition: "all 0.3s", cursor: "pointer",
                }}>
                  {shared ? "✦ シェア済み" : "世界に解き放つ ↗"}
                </button>
                <button onClick={() => setShowSave(true)} style={{
                  flex: 1, background: "transparent",
                  border: `1px solid ${t.accentSoft}50`,
                  color: t.textMuted,
                  padding: "0.9rem", fontFamily: MINCHO, fontSize: "0.72rem",
                  letterSpacing: "0.1em", transition: "all 0.3s", cursor: "pointer",
                }}>
                  保存する
                </button>
              </div>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={() => generate(cat)} style={{ flex: 1, background: "transparent", border: `1px solid ${t.accentSoft}35`, color: t.textMuted, padding: "0.75rem", fontFamily: MINCHO, fontSize: "0.68rem", letterSpacing: "0.1em", cursor: "pointer" }}>再生成する</button>
                <button onClick={() => setScreen("select")} style={{ flex: 1, background: "transparent", border: `1px solid ${t.accentSoft}35`, color: t.textMuted, padding: "0.75rem", fontFamily: MINCHO, fontSize: "0.68rem", letterSpacing: "0.1em", cursor: "pointer" }}>別の物語を読む</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━ シェアモーダル ━━━ */}
      {showShare && cat && (
        <div onClick={() => setShowShare(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0e0a08", borderTop: `1px solid ${t.accent}30`, padding: "2rem 1.8rem 2.5rem", width: "100%", maxWidth: 480, animation: "modal-in 0.3s ease", boxShadow: `0 -20px 60px ${t.accent}12` }}>
            <div style={{ writingMode: "vertical-rl", fontSize: "0.82rem", color: t.text, lineHeight: 2, margin: "0 auto 1.8rem", height: 160, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.12em" }}>
              シェアした瞬間、この物語は世界に生まれます。読まれなければ、三十日で朽ちます。
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <button onClick={async () => {
                try {
                  const url = await publishStory();
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText(url))}`, "_blank");
                  setShared(true); setShowShare(false);
                } catch { /* silent */ }
              }} disabled={shareLoading} style={{ background: shareLoading ? `${t.accent}60` : t.accent, border: "none", color: "#000", padding: "1rem", fontSize: "0.8rem", letterSpacing: "0.15em", fontFamily: MINCHO, fontWeight: 700, cursor: shareLoading ? "wait" : "pointer" }}>
                {shareLoading ? "物語を世界へ届けています…" : "𝕏（Twitter）でシェア"}
              </button>
              <button onClick={async () => {
                try {
                  const url = await publishStory();
                  const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
                  if (isMobile && navigator.share) {
                    await navigator.share({ title: "Only Your Story", text: buildShareText(url), url });
                    setShared(true); setShowShare(false);
                  } else {
                    await navigator.clipboard.writeText(url);
                    setShowShare(false);
                    setToast("URLをコピーしました");
                    setTimeout(() => setToast(""), 2500);
                  }
                } catch { /* silent */ }
              }} disabled={shareLoading} style={{ background: "transparent", border: `1px solid ${t.accentSoft}50`, color: t.text, padding: "0.9rem", fontSize: "0.75rem", letterSpacing: "0.12em", fontFamily: MINCHO, cursor: shareLoading ? "wait" : "pointer" }}>
                {/iPhone|iPad|Android/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? "その他でシェア" : "URLをコピー"}
              </button>
              <button onClick={() => setShowShare(false)} style={{ background: "transparent", border: "none", color: t.textMuted, fontSize: "0.68rem", fontFamily: MINCHO, letterSpacing: "0.1em", padding: "0.5rem", cursor: "pointer" }}>
                やっぱりやめる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ 戻る確認モーダル ━━━ */}
      {showBackConfirm && cat && (
        <div onClick={() => setShowBackConfirm(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0e0a08", borderTop: `1px solid ${t.accent}30`, padding: "2rem 1.8rem 2.5rem", width: "100%", maxWidth: 480, animation: "modal-in 0.3s ease", boxShadow: `0 -20px 60px ${t.accent}12` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginBottom: "1.8rem" }}>
              <div style={{ writingMode: "vertical-rl", fontSize: "0.88rem", color: t.text, lineHeight: 2, letterSpacing: "0.15em", height: 140, display: "flex", alignItems: "center", justifyContent: "center", textShadow: `0 0 20px ${t.accent}20` }}>
                この物語は、まだ世界に存在していません。
              </div>
              <p style={{ fontSize: "0.7rem", color: t.textMuted, letterSpacing: "0.08em", lineHeight: 2, textAlign: "center" }}>
                シェアも保存もせずに戻ると、<br />この物語は永遠に失われます。
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <button onClick={() => { setShowBackConfirm(false); setScreen("select"); }} style={{ background: "transparent", border: `1px solid rgba(150,80,60,0.4)`, color: "#8a5040", padding: "0.9rem", fontSize: "0.75rem", letterSpacing: "0.12em", fontFamily: MINCHO, cursor: "pointer" }}>
                戻る（物語を消す）
              </button>
              <button onClick={() => setShowBackConfirm(false)} style={{ background: t.accent, border: "none", color: "#000", padding: "1rem", fontSize: "0.8rem", letterSpacing: "0.15em", fontFamily: MINCHO, fontWeight: 700, boxShadow: `0 0 18px ${t.accent}40`, cursor: "pointer" }}>
                やっぱり残す
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ トースト ━━━ */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)",
          background: "#1e1810", border: "1px solid rgba(200,168,122,0.3)",
          color: "#c8a87a", padding: "0.7rem 1.4rem",
          fontSize: "0.72rem", fontFamily: MINCHO, letterSpacing: "0.12em",
          zIndex: 200, whiteSpace: "nowrap",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* ━━━ 本棚 ━━━ */}
      {screen === "shelf" && (
        <div style={{ width: "100%", maxWidth: 480, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem 0" }}>
            <button onClick={() => { setShelfStory(null); setScreen("select"); }} style={{ background: "transparent", border: "none", color: "#6a5848", fontSize: "0.65rem", fontFamily: MINCHO, letterSpacing: "0.1em", cursor: "pointer" }}>← 戻る</button>
            <div style={{ fontSize: "0.5rem", letterSpacing: "0.4em", color: "#4a3828", fontFamily: "'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <div style={{ fontSize: "0.62rem", color: "#c8a87a", fontFamily: MINCHO, letterSpacing: "0.15em" }}>本棚</div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(to right,transparent,#c8a87a40,transparent)", margin: "0.8rem 1.5rem 0" }} />

          {shelfStory ? (
            /* 保存済み物語の閲覧 */
            <>
              {shelfStory.title && (
                <div style={{ padding: "1rem 1.5rem 0", display: "flex", justifyContent: "center" }}>
                  <div style={{ writingMode: "vertical-rl", fontSize: "1.1rem", fontWeight: 400, color: "#c8a87a", letterSpacing: "0.2em", textShadow: "0 0 20px #c8a87a40" }}>
                    {shelfStory.title}
                  </div>
                </div>
              )}
              <div style={{ flex: 1, padding: "1.5rem", display: "flex", justifyContent: "center" }}>
                <div style={{
                  writingMode: "vertical-rl", textOrientation: "mixed",
                  height: "calc(100vh - 200px)", maxHeight: 580,
                  overflowX: "auto", overflowY: "hidden",
                  fontSize: "1rem", lineHeight: 2.2, letterSpacing: "0.12em",
                  whiteSpace: "pre-wrap", fontFamily: MINCHO, fontWeight: 300,
                  color: "#c8b8a8", background: "rgba(200,168,122,0.03)",
                  padding: "0.8rem 1.2rem",
                  borderLeft: "1px solid #c8a87a20",
                  borderRight: "1px solid #c8a87a10",
                }}>
                  {shelfStory.content}
                </div>
              </div>
              <div style={{ padding: "0.8rem 1.5rem 2rem", display: "flex", gap: "0.6rem" }}>
                <button onClick={() => setShelfStory(null)} style={{ flex: 1, background: "transparent", border: "1px solid rgba(200,168,122,0.2)", color: "#6a5848", padding: "0.75rem", fontFamily: MINCHO, fontSize: "0.68rem", letterSpacing: "0.1em", cursor: "pointer" }}>一覧に戻る</button>
                <button onClick={() => {
                  deleteFromLocal(shelfStory.id);
                  setShelfStory(null);
                }} style={{ flex: 1, background: "transparent", border: "1px solid rgba(150,50,30,0.3)", color: "#8a4030", padding: "0.75rem", fontFamily: MINCHO, fontSize: "0.68rem", letterSpacing: "0.1em", cursor: "pointer" }}>削除する</button>
              </div>
            </>
          ) : (
            /* 保存済み一覧 */
            <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
              {savedStories.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
                  <p style={{ color: "#4a3828", fontSize: "0.75rem", fontFamily: MINCHO, letterSpacing: "0.1em" }}>保存された物語はありません</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {savedStories.map(s => {
                    const c = CATEGORIES.find(c => c.id === s.categoryId);
                    const date = new Date(s.savedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
                    return (
                      <div key={s.id} onClick={() => setShelfStory(s)} style={{
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                        color: "#b0a090", padding: "1rem 1.2rem",
                        display: "flex", alignItems: "center", gap: "0.9rem",
                        fontFamily: MINCHO, transition: "all 0.22s", cursor: "pointer",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#c8a87a14"; e.currentTarget.style.borderColor = "#c8a87a44"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 400, letterSpacing: "0.08em", color: "#c8b8a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.title || "（無題）"}
                          </div>
                          <div style={{ fontSize: "0.6rem", color: "#5a4838", letterSpacing: "0.1em" }}>
                            {c?.label ?? s.categoryId} · {date}
                          </div>
                        </div>
                        <button
                          onClick={e => downloadPdf(s, e)}
                          disabled={downloadingIds.has(s.id)}
                          style={{
                            background: "transparent",
                            border: `1px solid rgba(200,168,122,${downloadingIds.has(s.id) ? "0.1" : "0.25"})`,
                            color: downloadingIds.has(s.id) ? "#4a3828" : "#8a6840",
                            padding: "0.35rem 0.65rem", fontFamily: MINCHO, fontSize: "0.58rem",
                            letterSpacing: "0.1em", cursor: downloadingIds.has(s.id) ? "wait" : "pointer",
                            flexShrink: 0, transition: "all 0.2s",
                          }}
                        >
                          {downloadingIds.has(s.id) ? "生成中…" : "PDF"}
                        </button>
                        <span style={{ color: "#3a2818", fontSize: "0.7rem", flexShrink: 0 }}>→</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ━━━ 保存モーダル ━━━ */}
      {showSave && cat && (
        <div onClick={() => setShowSave(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0e0a08", borderTop: `1px solid ${t.accent}30`, padding: "2rem 1.8rem 2.5rem", width: "100%", maxWidth: 480, animation: "modal-in 0.3s ease", boxShadow: `0 -20px 60px ${t.accent}12` }}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.8rem" }}>📖</div>
              <p style={{ fontSize: "0.82rem", color: t.text, lineHeight: 1.9, letterSpacing: "0.08em" }}>
                この物語を本棚に永久保存しますか？<br />
                <span style={{ color: t.textMuted, fontSize: "0.72rem" }}>読まれなくなっても、あなたの手元に残り続けます。</span>
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <button onClick={() => cat && handleSave({ title, story, categoryId: cat.id, categoryLabel: cat.label, accent: cat.theme.accent, setLoading: setCheckoutLoading })} disabled={checkoutLoading} style={{ background: checkoutLoading ? `${t.accent}60` : t.accent, border: "none", color: "#000", padding: "1rem", fontSize: "0.8rem", letterSpacing: "0.15em", fontFamily: MINCHO, fontWeight: 700, cursor: checkoutLoading ? "wait" : "pointer", transition: "background 0.3s" }}>
                {checkoutLoading ? "決済画面へ移動中…" : "￥50 で永久保存する"}
              </button>
              <button onClick={() => setShowSave(false)} style={{ background: "transparent", border: "none", color: t.textMuted, fontSize: "0.68rem", fontFamily: MINCHO, letterSpacing: "0.1em", padding: "0.5rem", cursor: "pointer" }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
