import { useState, useEffect } from "react";

const MINCHO = "'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif";

const CONCEPT_SECTIONS = [
  {
    vertical: "物語は、読まれるまで存在しない。",
    body: `ここで生まれる物語は、あなたが「読みたい」と思った瞬間にはじめて産声を上げる。

それ以前は、どこにも存在しない。
誰の記憶にも、どのサーバーにも。

あなたのために、あなたの今この瞬間のために、物語は紡がれる。`,
  },
  {
    vertical: "シェアするまで、世界には届かない。",
    body: `気に入らなければ、物語はそのまま消える。

誰にも知られず、静かに。
それでいい。

でも、もし胸の奥に何かが残ったなら——
その物語を世界に解き放つことができる。

シェアした瞬間、物語ははじめて「存在」になる。`,
  },
  {
    vertical: "読まれなければ、物語は朽ちていく。",
    body: `世に出た物語にも、寿命がある。

誰かに読まれるたびに、命は延びる。
忘れられるたびに、少しずつ朽ちていく。

三十日、誰にも読まれなかった物語は、
静かに、跡形もなく消える。

噂とは、そういうものだ。
広められなければ、はじめから存在しなかったことになる。`,
  },
  {
    vertical: "手元に残したいなら、永久に刻める。",
    body: `消えてほしくない物語がある。

そう思ったとき、あなたは十円でその物語を手元に残せる。
朽ちることのない、あなただけの一冊として。

本棚に並ぶのは、あなたが選んだ物語だけだ。`,
  },
  {
    vertical: "あなたがシェアするまで、この物語は存在しない。",
    body: `世界中に、今この瞬間も無数の物語が生まれている。

そのほとんどは、誰にも知られず消えていく。

あなたが読んだ物語は、どうなるだろう。

——それを決めるのは、あなただけだ。`,
  },
];

const CATEGORIES = [
  {
    id: "romance", label: "恋愛", emoji: "🌸",
    theme: { bg: "linear-gradient(160deg,#1a0a14,#2d1024,#1a0814)", accent: "#f4a0c0", accentSoft: "#c4607a", text: "#fce8f0", textMuted: "#a06070", paperBg: "rgba(252,232,240,0.04)" },
    prompt: `あなたは日本の文芸小説作家です。短編小説を書いてください。

ジャンル：恋愛 / 文字数：2000〜2500文字（必ず守ること）
文体：文学的・余韻を残す品のある日本語
構成：一瞬の情景や感情を切り取る「掌編」スタイル
テーマ：日常の中の小さな恋心、すれ違い、言えなかった言葉など

出力形式（必ず守ること）：
1行目に「TITLE:」に続けてタイトルを書く
2行目は「---」のみ
3行目以降に本文を書く

例：
TITLE: 春の傘
---
本文がここから始まる…

絶対に守るルール：
- #・**・* などのマークダウン記号は一切使わないこと
- 本文は「了」で終わること
- 情景・行動・セリフで感情を表現する（直接描写は避ける）
- 縦書きで読んだときに美しく見えるよう改行を工夫する`,
  },
  {
    id: "sf", label: "ＳＦ", emoji: "🚀",
    theme: { bg: "linear-gradient(160deg,#000814,#001838,#000c20)", accent: "#00d4ff", accentSoft: "#0080aa", text: "#c0f0ff", textMuted: "#406070", paperBg: "rgba(0,212,255,0.03)" },
    prompt: `あなたは日本のSF短編小説作家です。短編小説を書いてください。

ジャンル：SF / 文字数：2000〜2500文字（必ず守ること）
文体：文学的・哲学的な余韻を持つ日本語
構成：ショートショート形式。最後の一文で深い余韻またはどんでん返しを残す
テーマ：記憶・時間・AI・孤独・宇宙・消滅のいずれか

出力形式（必ず守ること）：
1行目に「TITLE:」に続けてタイトルを書く
2行目は「---」のみ
3行目以降に本文を書く

絶対に守るルール：
- #・**・* などのマークダウン記号は一切使わないこと
- 本文は「了」で終わること
- 星新一・テッド・チャンを意識した品質`,
  },
  {
    id: "bad", label: "後味の悪い話", emoji: "🩸",
    theme: { bg: "linear-gradient(160deg,#0a0a0a,#1a0a0a,#080808)", accent: "#cc2200", accentSoft: "#661100", text: "#d0c0c0", textMuted: "#604040", paperBg: "rgba(200,30,0,0.03)" },
    prompt: `あなたは日本の怪談・ホラー短編作家です。短編小説を書いてください。

ジャンル：後味の悪い話 / 文字数：1500〜2000文字（必ず守ること）
文体：淡々とした日常描写から始まり、じわじわ違和感が積み重なる
構成：日常→異変→不条理な結末

出力形式（必ず守ること）：
1行目に「TITLE:」に続けてタイトルを書く
2行目は「---」のみ
3行目以降に本文を書く

絶対に守るルール：
- #・**・* などのマークダウン記号は一切使わないこと
- 本文は「了」で終わること
- 「ゾッとした」などの安易な表現は避ける
- 説明せず、読者に想像させる`,
  },
  {
    id: "urban", label: "都市伝説", emoji: "👁",
    theme: { bg: "linear-gradient(160deg,#050510,#0a0a20,#050510)", accent: "#7700ff", accentSoft: "#440088", text: "#d0c0ff", textMuted: "#504060", paperBg: "rgba(119,0,255,0.04)" },
    prompt: `あなたは日本の都市伝説・怪異短編作家です。短編小説を書いてください。

ジャンル：都市伝説 / 文字数：1500〜2000文字（必ず守ること）
文体：「〜らしい」「〜と言われている」という伝聞形式で始まり、最後に読者自身が当事者になる
テーマ候補（毎回ランダムに選ぶこと）：
・特定の場所にまつわる怪異（廃病院・トンネル・踏切・山道など）
・特定の行動をすると呪われる系
・SNSや口コミで広まった現代の怪談
・日本各地に伝わる土着の風習や禁忌
・ある人物の失踪や奇妙な体験談

出力形式（必ず守ること）：
1行目に「TITLE:」に続けてタイトルを書く
2行目は「---」のみ
3行目以降に本文を書く

絶対に守るルール：
- #・**・* などのマークダウン記号は一切使わないこと
- 本文は意味深な一文で終わること（「了」は不要）
- 毎回異なるテーマ・舞台・怪異を選ぶこと`,
  },
  {
    id: "riddle", label: "読後に意味がわかる", emoji: "🌀",
    theme: { bg: "linear-gradient(160deg,#080c10,#101820,#080c10)", accent: "#40c080", accentSoft: "#208040", text: "#c0e0d0", textMuted: "#406050", paperBg: "rgba(64,192,128,0.03)" },
    prompt: `あなたは叙述トリック専門の短編作家です。短編小説を書いてください。

ジャンル：読後に意味がわかる話 / 文字数：1500〜2000文字（必ず守ること）
構成：一見普通の話→最後の数行で認識が180度ひっくり返る
手法：語り手の正体・時間軸のずれ・言葉の二重の意味など

出力形式（必ず守ること）：
1行目に「TITLE:」に続けてタイトルを書く
2行目は「---」のみ
3行目以降に本文を書く

絶対に守るルール：
- #・**・* などのマークダウン記号は一切使わないこと
- 本文は「了」で終わり、続けて「（もう一度、最初から読んでみてください）」と書く
- 伏線は自然に埋め込む
- 安易な「実は死んでいた」は避け、精巧なトリックを使う`,
  },
];

const LOADING_MSGS = ["物語を紡いでいます…","墨が乾くまでお待ちください…","あなただけの頁を生成中…","この物語はまだ誰も読んでいません…"];

const stripMarkdown = (text) =>
  text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/^[\-\*]\s+/gm, "")
    .replace(/`(.+?)`/g, "$1")
    .trim();

// ── ルーティング判定 ──
const getInitialScreen = () => {
  if (window.location.hash === "#about") return "concept";
  try {
    if (!localStorage.getItem("oys_visited")) return "concept";
  } catch(e) {}
  return "select";
};

export default function App() {
  const [screen, setScreen] = useState(getInitialScreen);
  const [conceptPage, setConceptPage] = useState(0);
  const [conceptVisible, setConceptVisible] = useState(true);

  // メイン
  const [cat, setCat] = useState(null);
  const [story, setStory] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [showShare, setShowShare] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  const t = cat?.theme || { bg:"#0a0806", accent:"#c8a87a", accentSoft:"#7a6040", text:"#e8dcc8", textMuted:"#786858", paperBg:"rgba(255,255,255,0.02)" };

  // ハッシュ変化を監視
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#about") setScreen("concept");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // コンセプトページ遷移アニメ
  const goConceptPage = (dir) => {
    setConceptVisible(false);
    setTimeout(() => {
      setConceptPage(p => dir === "next" ? p + 1 : p - 1);
      setConceptVisible(true);
    }, 250);
  };

  // コンセプト完了 → メインへ
  const finishConcept = () => {
    try { localStorage.setItem("oys_visited", "1"); } catch(e) {}
    window.location.hash = "";
    setScreen("select");
  };

  // ストーリー生成
  const generate = async (c) => {
    setCat(c);
    setScreen("reading");
    setLoading(true);
    setStory("");
    setTitle("");
    setError("");
    setShared(false);
    setSaved(false);
    let idx = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    const mi = setInterval(() => { idx = (idx+1) % LOADING_MSGS.length; setLoadingMsg(LOADING_MSGS[idx]); }, 1400);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [{ role: "user", content: c.prompt }],
        }),
      });
      clearInterval(mi);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const raw = data.content?.[0]?.text || "";
      const lines = raw.split("\n");
      let parsedTitle = "";
      let bodyStart = 0;
      if (lines[0].startsWith("TITLE:")) {
        parsedTitle = lines[0].replace("TITLE:", "").trim();
        bodyStart = lines[1] === "---" ? 2 : 1;
      }
      const bodyText = lines.slice(bodyStart).join("\n");
      setTitle(parsedTitle);
      setStory(stripMarkdown(bodyText));
    } catch (e) {
      clearInterval(mi);
      setError("生成に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const sec = CONCEPT_SECTIONS[conceptPage];
  const shareText = cat ? `「Only Your Story」で${cat.label}の物語を読みました。\n\nあなたがシェアするまで、この物語は存在しない。\n\n#OnlyYourStory` : "";

  return (
    <div style={{ minHeight:"100vh", background: screen === "concept" ? "#080604" : t.bg, color: screen === "concept" ? "#d8cdb8" : t.text, fontFamily:MINCHO, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", transition:"background 1.2s, color 0.6s", overflow:"hidden", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;} button{outline:none;cursor:pointer;}
        @keyframes fi{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:.2;}50%{opacity:.5;}}
        @keyframes slV{0%{top:-100%;}100%{top:100%;}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes modalIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
      `}</style>

      {cat && screen !== "concept" && (
        <div style={{ position:"fixed", top:"35%", left:"50%", transform:"translateX(-50%)", width:250, height:250, borderRadius:"50%", background:`${cat.theme.accent}15`, filter:"blur(70px)", pointerEvents:"none", animation:"pulse 4s ease-in-out infinite" }} />
      )}

      {/* ━━━━━━ CONCEPT PAGE ━━━━━━ */}
      {screen === "concept" && (
        <div style={{ width:"100%", maxWidth:480, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1.5rem 1.8rem 0" }}>
            <div style={{ fontSize:"0.5rem", letterSpacing:"0.45em", color:"#3a2818", fontFamily:"'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <button onClick={finishConcept} style={{ background:"transparent", border:"none", color:"#4a3828", fontSize:"0.6rem", fontFamily:MINCHO, letterSpacing:"0.12em" }}>
              スキップ →
            </button>
          </div>

          {/* プログレス */}
          <div style={{ height:1, background:"rgba(255,255,255,0.04)", margin:"1rem 1.8rem 0", position:"relative" }}>
            <div style={{ position:"absolute", top:0, left:0, height:"100%", width:`${(conceptPage+1)/CONCEPT_SECTIONS.length*100}%`, background:"linear-gradient(to right,#6a5030,#c8a87a)", transition:"width 0.6s ease", boxShadow:"0 0 8px rgba(200,168,122,0.3)" }} />
          </div>

          <div style={{ flex:1, padding:"2.5rem 1.8rem", display:"flex", flexDirection:"column", justifyContent:"center", gap:"2.5rem" }}>
            {/* 縦書きキャッチ */}
            <div style={{ display:"flex", justifyContent:"center", opacity:conceptVisible?1:0, transform:conceptVisible?"translateY(0)":"translateY(12px)", transition:"opacity 0.4s, transform 0.4s" }}>
              <div style={{ writingMode:"vertical-rl", fontSize:"1.1rem", fontWeight:400, lineHeight:1.9, color:"#c8a87a", letterSpacing:"0.18em", height:200, display:"flex", alignItems:"center", justifyContent:"center", borderRight:"1px solid rgba(200,168,122,0.2)", paddingRight:"1.2rem", textShadow:"0 0 30px rgba(200,168,122,0.2)" }}>
                {sec.vertical}
              </div>
            </div>

            {/* 本文 */}
            <div style={{ opacity:conceptVisible?1:0, transform:conceptVisible?"translateY(0)":"translateY(8px)", transition:"opacity 0.4s 0.1s, transform 0.4s 0.1s" }}>
              <p style={{ fontSize:"0.8rem", lineHeight:2.4, color:"#8a7868", letterSpacing:"0.08em", whiteSpace:"pre-wrap", borderLeft:"1px solid rgba(255,255,255,0.06)", paddingLeft:"1.2rem" }}>
                {sec.body}
              </p>
            </div>

            {/* ドット */}
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {CONCEPT_SECTIONS.map((_, i) => (
                <button key={i} onClick={() => { setConceptVisible(false); setTimeout(() => { setConceptPage(i); setConceptVisible(true); }, 250); }} style={{ width:i===conceptPage?20:5, height:4, background:i===conceptPage?"#c8a87a":"rgba(255,255,255,0.1)", border:"none", borderRadius:2, transition:"all 0.4s", boxShadow:i===conceptPage?"0 0 8px rgba(200,168,122,0.5)":"none", padding:0 }} />
              ))}
            </div>
          </div>

          {/* ナビ */}
          <div style={{ padding:"0 1.8rem 2.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <button onClick={() => goConceptPage("prev")} disabled={conceptPage===0} style={{ background:"transparent", border:`1px solid ${conceptPage===0?"transparent":"rgba(255,255,255,0.08)"}`, color:conceptPage===0?"transparent":"#6a5848", padding:"0.75rem 1.2rem", fontFamily:MINCHO, fontSize:"0.7rem", letterSpacing:"0.12em", transition:"all 0.2s", pointerEvents:conceptPage===0?"none":"auto" }}>
              前へ
            </button>
            {conceptPage < CONCEPT_SECTIONS.length - 1 ? (
              <button onClick={() => goConceptPage("next")} style={{ background:"transparent", border:"1px solid rgba(200,168,122,0.3)", color:"#c8a87a", padding:"0.75rem 1.8rem", fontFamily:MINCHO, fontSize:"0.7rem", letterSpacing:"0.18em", transition:"all 0.3s" }}>
                次へ
              </button>
            ) : (
              <button onClick={finishConcept} style={{ background:"#c8a87a", border:"none", color:"#1a0e04", padding:"0.85rem 2rem", fontFamily:MINCHO, fontSize:"0.75rem", letterSpacing:"0.2em", fontWeight:700, boxShadow:"0 0 24px rgba(200,168,122,0.4)", animation:"float 3s ease-in-out infinite" }}>
                物語をはじめる
              </button>
            )}
          </div>
        </div>
      )}

      {/* ━━━━━━ SELECT ━━━━━━ */}
      {screen === "select" && (
        <div style={{ width:"100%", maxWidth:440, padding:"2rem 1.5rem", animation:"fi 0.5s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.4rem" }}>
            <div style={{ fontSize:"0.55rem", letterSpacing:"0.5em", color:"#4a3828", fontFamily:"'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <button onClick={() => { setConceptPage(0); setScreen("concept"); window.location.hash = "#about"; }} style={{ background:"transparent", border:"none", color:"#4a3828", fontSize:"0.58rem", fontFamily:MINCHO, letterSpacing:"0.1em" }}>
              このサービスについて
            </button>
          </div>
          <div style={{ writingMode:"vertical-rl", fontSize:"0.88rem", fontWeight:300, color:"#6a5848", margin:"0 auto 2rem", letterSpacing:"0.12em", height:80, display:"flex", alignItems:"center", justifyContent:"center" }}>
            物語をお選びください
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
            {CATEGORIES.map((c, i) => (
              <button key={c.id} onClick={() => generate(c)} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", color:"#b0a090", padding:"1rem 1.2rem", textAlign:"left", display:"flex", alignItems:"center", gap:"0.9rem", fontFamily:MINCHO, transition:"all 0.22s", animation:`fi ${0.3+i*0.08}s ease` }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${c.theme.accent}14`;e.currentTarget.style.borderColor=`${c.theme.accent}44`;e.currentTarget.style.color=c.theme.accent;}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.02)";e.currentTarget.style.borderColor="rgba(255,255,255,0.07)";e.currentTarget.style.color="#b0a090";}}
              >
                <span style={{ fontSize:"0.55rem", letterSpacing:"0.3em", color:t.textMuted, fontFamily:"'Courier New',monospace", textTransform:"uppercase", minWidth:"3.5rem", flexShrink:0 }}>{c.id}</span>
                <div>
                  <div style={{ fontSize:"0.9rem", fontWeight:500, marginBottom:"0.12rem", letterSpacing:"0.08em" }}>{c.label}</div>
                  <div style={{ fontSize:"0.63rem", color:"#5a4838" }}>タップして生成する</div>
                </div>
                <span style={{ marginLeft:"auto", color:"#3a2818", fontSize:"0.7rem" }}>→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ━━━━━━ READING ━━━━━━ */}
      {screen === "reading" && cat && (
        <div style={{ width:"100%", maxWidth:480, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"1.2rem 1.5rem 0" }}>
            <button onClick={() => setScreen("select")} style={{ background:"transparent", border:"none", color:t.textMuted, fontSize:"0.65rem", fontFamily:MINCHO, letterSpacing:"0.1em" }}>← 戻る</button>
            <div style={{ fontSize:"0.5rem", letterSpacing:"0.4em", color:t.textMuted, fontFamily:"'Courier New',monospace" }}>ONLY YOUR STORY</div>
            <div style={{ fontSize:"0.62rem", color:t.accent, fontFamily:"'Courier New',monospace", letterSpacing:"0.15em" }}>{cat.label}</div>
          </div>
          <div style={{ height:1, background:`linear-gradient(to right,transparent,${t.accent}40,transparent)`, margin:"0.8rem 1.5rem 0" }} />

          {/* タイトル表示 */}
          {title && !loading && (
            <div style={{ padding:"1rem 1.5rem 0", display:"flex", justifyContent:"center" }}>
              <div style={{ writingMode:"vertical-rl", fontSize:"1.1rem", fontWeight:400, color:t.accent, letterSpacing:"0.2em", textShadow:`0 0 20px ${t.accent}40` }}>
                {title}
              </div>
            </div>
          )}

          <div style={{ flex:1, padding:"1.5rem", display:"flex", justifyContent:"center", alignItems:loading?"center":"flex-start" }}>
            {loading && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"2rem" }}>
                <div style={{ writingMode:"vertical-rl", fontSize:"0.78rem", color:t.textMuted, letterSpacing:"0.15em", fontFamily:MINCHO, minHeight:"6rem", textAlign:"center" }}>{loadingMsg}</div>
                <div style={{ width:1, height:60, background:t.accentSoft, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:"-100%", left:0, width:"100%", height:"100%", background:t.accent, animation:"slV 1.1s ease-in-out infinite" }} />
                </div>
              </div>
            )}
            {error && !loading && (
              <div style={{ textAlign:"center" }}>
                <p style={{ color:t.textMuted, fontSize:"0.8rem", marginBottom:"1.5rem" }}>{error}</p>
                <button onClick={() => generate(cat)} style={{ background:"transparent", border:`1px solid ${t.accentSoft}`, color:t.text, padding:"0.8rem 1.5rem", fontFamily:MINCHO, fontSize:"0.75rem", letterSpacing:"0.1em" }}>再生成する</button>
              </div>
            )}
            {story && !loading && (
              <div style={{ writingMode:"vertical-rl", textOrientation:"mixed", height:"calc(100vh - 200px)", maxHeight:580, overflowX:"auto", overflowY:"hidden", fontSize:"1rem", lineHeight:2.2, letterSpacing:"0.12em", whiteSpace:"pre-wrap", fontFamily:MINCHO, fontWeight:300, color:t.text, background:t.paperBg, padding:"0.8rem 1.2rem", borderLeft:`1px solid ${t.accent}20`, borderRight:`1px solid ${t.accent}10`, animation:"fadeIn 1s ease" }}>
                {story}
              </div>
            )}
          </div>

          {story && !loading && (
            <div style={{ padding:"0.8rem 1.5rem 2rem", display:"flex", flexDirection:"column", gap:"0.6rem" }}>
              <div style={{ display:"flex", gap:"0.6rem" }}>
                <button onClick={() => setShowShare(true)} style={{ flex:2, background:shared?`${t.accent}30`:t.accent, border:"none", color:shared?t.accent:"#000", padding:"0.9rem", fontFamily:MINCHO, fontSize:"0.75rem", letterSpacing:"0.12em", fontWeight:700, boxShadow:shared?"none":`0 0 18px ${t.accent}40`, transition:"all 0.3s" }}>
                  {shared ? "✦ シェア済み" : "世界に解き放つ ↗"}
                </button>
                <button onClick={() => setShowSave(true)} style={{ flex:1, background:saved?`${t.accent}15`:"transparent", border:`1px solid ${saved?t.accent:t.accentSoft+"50"}`, color:saved?t.accent:t.textMuted, padding:"0.9rem", fontFamily:MINCHO, fontSize:"0.72rem", letterSpacing:"0.1em", transition:"all 0.3s" }}>
                  {saved ? "✦ 保存済み" : "保存する"}
                </button>
              </div>
              <div style={{ display:"flex", gap:"0.6rem" }}>
                <button onClick={() => generate(cat)} style={{ flex:1, background:"transparent", border:`1px solid ${t.accentSoft}35`, color:t.textMuted, padding:"0.75rem", fontFamily:MINCHO, fontSize:"0.68rem", letterSpacing:"0.1em" }}>再生成する</button>
                <button onClick={() => setScreen("select")} style={{ flex:1, background:"transparent", border:`1px solid ${t.accentSoft}35`, color:t.textMuted, padding:"0.75rem", fontFamily:MINCHO, fontSize:"0.68rem", letterSpacing:"0.1em" }}>別の物語を読む</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━ シェアモーダル ━━━━━━ */}
      {showShare && cat && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={() => setShowShare(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#0e0a08", borderTop:`1px solid ${t.accent}30`, padding:"2rem 1.8rem 2.5rem", width:"100%", maxWidth:480, animation:"modalIn 0.3s ease", boxShadow:`0 -20px 60px ${t.accent}12` }}>
            <div style={{ writingMode:"vertical-rl", fontSize:"0.82rem", color:t.text, lineHeight:2, margin:"0 auto 1.8rem", height:160, display:"flex", alignItems:"center", justifyContent:"center", letterSpacing:"0.12em" }}>
              シェアした瞬間、この物語は世界に生まれます。読まれなければ、三十日で朽ちます。
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
              <button onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,"_blank"); setShared(true); setShowShare(false); }} style={{ background:t.accent, border:"none", color:"#000", padding:"1rem", fontSize:"0.8rem", letterSpacing:"0.15em", fontFamily:MINCHO, fontWeight:700 }}>
                𝕏（Twitter）でシェア
              </button>
              <button onClick={() => { navigator.share?navigator.share({title:"Only Your Story",text:shareText}):navigator.clipboard?.writeText(shareText); setShared(true); setShowShare(false); }} style={{ background:"transparent", border:`1px solid ${t.accentSoft}50`, color:t.text, padding:"0.9rem", fontSize:"0.75rem", letterSpacing:"0.12em", fontFamily:MINCHO }}>
                その他でシェア / リンクをコピー
              </button>
              <button onClick={() => setShowShare(false)} style={{ background:"transparent", border:"none", color:t.textMuted, fontSize:"0.68rem", fontFamily:MINCHO, letterSpacing:"0.1em", padding:"0.5rem" }}>
                やっぱりやめる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━ 保存モーダル ━━━━━━ */}
      {showSave && cat && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"flex-end", justifyContent:"center", zIndex:100 }} onClick={() => setShowSave(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#0e0a08", borderTop:`1px solid ${t.accent}30`, padding:"2rem 1.8rem 2.5rem", width:"100%", maxWidth:480, animation:"modalIn 0.3s ease", boxShadow:`0 -20px 60px ${t.accent}12` }}>
            <div style={{ textAlign:"center", marginBottom:"1.5rem" }}>
              <div style={{ fontSize:"1.5rem", marginBottom:"0.8rem" }}>📖</div>
              <p style={{ fontSize:"0.82rem", color:t.text, lineHeight:1.9, letterSpacing:"0.08em" }}>
                この物語を本棚に永久保存しますか？<br/>
                <span style={{ color:t.textMuted, fontSize:"0.72rem" }}>読まれなくなっても、あなたの手元に残り続けます。</span>
              </p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.65rem" }}>
              <button onClick={() => { const b=new Blob([story],{type:"text/plain;charset=utf-8"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`oys-${cat.id}.txt`;a.click();URL.revokeObjectURL(u);setSaved(true);setShowSave(false); }} style={{ background:t.accent, border:"none", color:"#000", padding:"1rem", fontSize:"0.8rem", letterSpacing:"0.15em", fontFamily:MINCHO, fontWeight:700 }}>
                ￥10 で永久保存する
              </button>
              <button onClick={() => { navigator.clipboard?.writeText(story); alert("テキストをコピーしました"); setShowSave(false); }} style={{ background:"transparent", border:`1px solid ${t.accentSoft}50`, color:t.textMuted, padding:"0.9rem", fontSize:"0.72rem", letterSpacing:"0.1em", fontFamily:MINCHO }}>
                テキストをコピー（無料）
              </button>
              <button onClick={() => setShowSave(false)} style={{ background:"transparent", border:"none", color:t.textMuted, fontSize:"0.68rem", fontFamily:MINCHO, letterSpacing:"0.1em", padding:"0.5rem" }}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
