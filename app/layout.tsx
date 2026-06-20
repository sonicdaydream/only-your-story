import type { Metadata } from "next";
import { Noto_Serif_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-noto-serif-jp",
});

export const metadata: Metadata = {
  title: "Only Your Story",
  description: "AIが生成する、あなただけの一期一会の物語",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={notoSerifJP.variable}>
      <head>
        {/* Google Analytics 4 */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2BWGZKDTBE"
          strategy="afterInteractive"
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-2BWGZKDTBE');
            `,
          }}
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1626421381756721"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body style={{ fontFamily: "var(--font-noto-serif-jp), 'Yu Mincho', 'Hiragino Mincho ProN', Georgia, serif" }}>
        {children}
      </body>
    </html>
  );
}
