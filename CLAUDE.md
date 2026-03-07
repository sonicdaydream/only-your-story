# Only Your Story - プロジェクト概要

## 🎯 コンセプト
AIが生成する一期一会の物語体験アプリ。
- 読みたいと思った瞬間に物語が生成される
- シェアするまで世界に存在しない
- 読まれなければ30日で朽ちる
- 50円で永久保存可能

## 📱 ターゲット
- Web-first PWA（モバイル優先）
- 日本語ユーザー向け

## 🛠️ 技術スタック（推奨）

### フロントエンド
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + カスタムCSS（縦書き用）
- **Font**: Noto Serif JP（Google Fonts）
- **State**: React useState / zustand（必要に応じて）

### バックエンド
- **API**: Next.js API Routes (Edge Runtime推奨)
- **AI**: Claude API (claude-sonnet-4-20250514) または OpenAI API
- **Database**: Supabase（シェアされた物語の保存、朽ちる仕組み）
- **Payment**: Stripe（50円保存機能）

### インフラ
- **Hosting**: Vercel
- **Domain**: 未定（要決定）

## 📁 推奨ディレクトリ構成

```
only-your-story/
├── CLAUDE.md                 # このファイル
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
├── .env.local                # 環境変数（gitignore）
│
├── app/
│   ├── layout.tsx            # ルートレイアウト（フォント読み込み）
│   ├── page.tsx              # メインページ
│   ├── globals.css           # グローバルスタイル（縦書きアニメーション等）
│   │
│   ├── api/
│   │   └── generate/
│   │       └── route.ts      # 物語生成API（ストリーミング）
│   │
│   └── story/
│       └── [id]/
│           └── page.tsx      # シェアされた物語の閲覧ページ
│
├── components/
│   ├── ConceptScreen.tsx     # コンセプト説明画面
│   ├── CategorySelect.tsx    # カテゴリ選択画面
│   ├── StoryReader.tsx       # 物語表示（縦書き）
│   ├── ShareModal.tsx        # シェアモーダル
│   ├── SaveModal.tsx         # 保存モーダル
│   └── LoadingAnimation.tsx  # 生成中アニメーション
│
├── lib/
│   ├── categories.ts         # カテゴリ定義（テーマ、プロンプト）
│   ├── generateStory.ts      # AI API呼び出しロジック
│   └── constants.ts          # 定数定義
│
├── hooks/
│   └── useStoryGeneration.ts # 物語生成カスタムフック
│
└── public/
    ├── manifest.json         # PWA設定
    └── icons/                # アプリアイコン
```

## 🔑 環境変数

```env
# .env.local
ANTHROPIC_API_KEY=sk-ant-xxx      # Claude API
# または
OPENAI_API_KEY=sk-xxx             # OpenAI API

# Supabase（Phase 2で使用）
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe（Phase 3で使用）
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## 🚀 開発フェーズ

### Phase 1: MVP（まずここから）
- [x] UI/UXプロトタイプ完成
- [ ] Next.jsプロジェクトセットアップ
- [ ] コンポーネント分割
- [ ] 物語生成API実装（ストリーミング）
- [ ] ローカル保存機能（localStorage）
- [ ] PWA対応

### Phase 2: シェア機能
- [ ] Supabase接続
- [ ] シェアされた物語の保存
- [ ] 公開物語ページ（/story/[id]）
- [ ] 朽ちる仕組み（30日で削除 or 閲覧で延命）

### Phase 3: マネタイズ
- [ ] Stripe決済連携
- [ ] 50円永久保存機能
- [ ] 広告表示（オプション）

## 📝 カテゴリ定義

| ID | ラベル | テーマカラー | 文字数目安 |
|----|--------|-------------|-----------|
| romance | 恋愛 | #f4a0c0 (ピンク) | 2000-2500 |
| sf | ＳＦ | #00d4ff (シアン) | 2000-2500 |
| bad | 後味の悪い話 | #cc2200 (赤) | 1500-2000 |
| urban | 都市伝説 | #7700ff (紫) | 1500-2000 |
| riddle | 読後に意味がわかる | #40c080 (緑) | 1200-1500 |

## 🎨 デザインルール

### 縦書き表示
```css
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-family: 'Noto Serif JP', serif;
  line-height: 2.2;
  letter-spacing: 0.12em;
}
```

### フォント
- 本文: Noto Serif JP (weight: 300-400)
- UI: Noto Serif JP + Courier New（英字）

### カラーベース（デフォルト）
- 背景: #0e0a06（温かみのある黒）
- テキスト: #c8b8a8（柔らかいベージュ）
- アクセント: #c8a87a（金/琥珀色）

## ⚡ API設計

### POST /api/generate
物語を生成する（ストリーミング）

**Request:**
```json
{
  "categoryId": "romance"
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"type": "title", "content": "春の傘"}
data: {"type": "content", "content": "雨が降り始めた。"}
data: {"type": "content", "content": "彼女は..."}
data: {"type": "done"}
```

## 🔧 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check
```

## 📌 注意事項

1. **APIレート制限**: Claude APIの呼び出し回数に注意。ユーザー単位で制限を設ける
2. **プロンプトインジェクション対策**: カテゴリIDは固定値のみ許可
3. **コスト管理**: Claude Sonnetは入力$3/出力$15 per 1M tokens。1物語あたり約$0.01-0.02

## 🔗 参考リンク

- [Claude API Documentation](https://docs.anthropic.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)
