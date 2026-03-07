// app/api/generate-pdf/route.ts
// 必要なパッケージ：npm install @sparticuz/chromium puppeteer-core

import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// カテゴリ別アクセントカラー
const CATEGORY_COLORS: Record<string, { accent: string; glow: string; border: string }> = {
  romance: { accent: "#f4a0c0", glow: "#f4a0c040", border: "#f4a0c030" },
  sf:      { accent: "#00d4ff", glow: "#00d4ff40", border: "#00d4ff30" },
  bad:     { accent: "#cc2200", glow: "#cc220040", border: "#cc220030" },
  urban:   { accent: "#7700ff", glow: "#7700ff40", border: "#7700ff30" },
  riddle:  { accent: "#40c080", glow: "#40c08040", border: "#40c08030" },
};

// 1ページあたりの文字数目安
// 1ページ目はタイトル列が横幅を消費するため少なめ
const CHARS_FIRST = 360;
const CHARS_REST  = 440;

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  let isFirst = true;

  while (remaining.length > 0) {
    const limit = isFirst ? CHARS_FIRST : CHARS_REST;

    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    // 段落境界（改行）を優先して分割
    let splitAt = remaining.lastIndexOf("\n", limit);
    if (splitAt <= 0) splitAt = limit;

    chunks.push(remaining.slice(0, splitAt).trimEnd());
    remaining = remaining.slice(splitAt).trimStart();
    isFirst = false;
  }

  return chunks.filter(c => c.length > 0);
}

function buildHtml(params: {
  title: string;
  chunks: string[];
  category: string;
  date: string;
  colors: { accent: string; glow: string; border: string };
}): string {
  const { title, chunks, category, date, colors } = params;
  const { accent, glow, border } = colors;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A5 portrait; margin: 0; }

    html, body {
      background: #0e0a06;
      font-family: 'Noto Serif JP', 'Yu Mincho', 'Hiragino Mincho ProN', serif;
    }

    .page {
      width: 148mm;
      height: 210mm;
      padding: 14mm 12mm 12mm 12mm;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      background: #0e0a06;
      page-break-after: always;
    }
    .page.last-page { page-break-after: avoid; }

    .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8mm;
      padding-bottom: 3mm;
      border-bottom: 0.3pt solid rgba(200,168,122,0.25);
      flex-shrink: 0;
    }
    .brand {
      font-size: 5.5pt;
      letter-spacing: 0.45em;
      color: #4a3020;
      font-family: 'Courier New', monospace;
    }
    .category {
      font-size: 6pt;
      letter-spacing: 0.2em;
      color: ${accent};
      font-family: 'Courier New', monospace;
      opacity: 0.8;
    }

    .story-area {
      flex: 1;
      display: flex;
      flex-direction: row;
      gap: 7mm;
      overflow: hidden;
      min-height: 0;
    }
    .title-col {
      writing-mode: vertical-rl;
      font-size: 11pt;
      font-weight: 400;
      color: ${accent};
      letter-spacing: 0.22em;
      text-shadow: 0 0 12px ${glow};
      border-right: 0.5pt solid ${border};
      padding-right: 5mm;
      flex-shrink: 0;
      line-height: 1.8;
    }
    .body-col {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      font-size: 8.5pt;
      line-height: 2.1;
      letter-spacing: 0.1em;
      white-space: pre-wrap;
      font-weight: 300;
      color: #c8b8a8;
      flex: 1;
      overflow: hidden;
      height: 100%;
    }

    .footer {
      margin-top: 6mm;
      padding-top: 3mm;
      border-top: 0.3pt solid rgba(200,168,122,0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    .footer-brand {
      font-size: 5pt;
      letter-spacing: 0.4em;
      color: #3a2818;
      font-family: 'Courier New', monospace;
    }
    .footer-date {
      font-size: 5.5pt;
      color: #4a3828;
      letter-spacing: 0.08em;
    }

    .corner { position: absolute; width: 6mm; height: 6mm; opacity: 0.25; }
    .corner-tl { top: 8mm; left: 8mm; border-top: 0.5pt solid #c8a87a; border-left: 0.5pt solid #c8a87a; }
    .corner-tr { top: 8mm; right: 8mm; border-top: 0.5pt solid #c8a87a; border-right: 0.5pt solid #c8a87a; }
    .corner-bl { bottom: 8mm; left: 8mm; border-bottom: 0.5pt solid #c8a87a; border-left: 0.5pt solid #c8a87a; }
    .corner-br { bottom: 8mm; right: 8mm; border-bottom: 0.5pt solid #c8a87a; border-right: 0.5pt solid #c8a87a; }
  `;

  const pagesHtml = chunks.map((chunk, i) => {
    const isFirst = i === 0;
    const isLast  = i === chunks.length - 1;

    const corners = isFirst
      ? `<div class="corner corner-tl"></div><div class="corner corner-tr"></div>
         <div class="corner corner-bl"></div><div class="corner corner-br"></div>`
      : "";

    const meta = isFirst
      ? `<div class="meta">
           <div class="brand">ONLY YOUR STORY</div>
           <div class="category">${category}</div>
         </div>`
      : "";

    const titleCol = isFirst && title
      ? `<div class="title-col">${title}</div>`
      : "";

    const footer = isLast
      ? `<div class="footer">
           <div class="footer-brand">ONLY YOUR STORY — PERMANENT EDITION</div>
           <div class="footer-date">${date} 永久保存</div>
         </div>`
      : "";

    return `<div class="page${isLast ? " last-page" : ""}">
      ${corners}
      ${meta}
      <div class="story-area">
        ${titleCol}
        <div class="body-col">${chunk}</div>
      </div>
      ${footer}
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>${css}</style>
</head>
<body>${pagesHtml}</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { title, story, category, categoryId } = await req.json();

    if (!title || !story) {
      return NextResponse.json({ error: "title and story are required" }, { status: 400 });
    }

    const colors = CATEGORY_COLORS[categoryId] ?? CATEGORY_COLORS["romance"];
    const date = new Date().toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
    });

    const chunks = splitIntoChunks(story);
    const html = buildHtml({ title, chunks, category, date, colors });

    // ローカル開発: CHROME_EXECUTABLE_PATH 環境変数 or Windowsデフォルト
    // 本番(Vercel/Lambda): @sparticuz/chromium のバイナリを使用
    const executablePath =
      process.env.CHROME_EXECUTABLE_PATH ??
      (process.env.NODE_ENV !== "production"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : await chromium.executablePath());

    const browser = await puppeteer.launch({
      args: process.env.NODE_ENV !== "production"
        ? ["--no-sandbox", "--disable-setuid-sandbox"]
        : chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A5",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
