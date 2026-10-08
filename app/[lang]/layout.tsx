import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Noto_Sans_KR } from "next/font/google";
import "../globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { languageAlternates, sharedOpenGraph } from "@/lib/metadata";
import { site, siteUrl, verification } from "@/lib/site";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

type Props = { children: ReactNode; params: Promise<{ lang: string }> };

// 한국어(/)와 영어(/en) 화면을 미리 만들어 둡니다. 주소 규칙은 proxy.ts 에 있습니다.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDictionary(lang);
  const title = d.site.homeTitle;
  const description = site.description[lang];

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${d.site.titleSuffix}` },
    description,
    keywords: d.site.keywords,
    openGraph: { ...sharedOpenGraph(lang), title, description },
    alternates: languageAlternates(lang, "/"),
    verification: {
      google: verification.google || undefined,
      other: verification.naver ? { "naver-site-verification": verification.naver } : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#00529c",
};

export default async function RootLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header lang={lang} />
        <main className="flex-1">{children}</main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
