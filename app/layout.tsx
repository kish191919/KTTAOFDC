import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { sharedOpenGraph } from "@/lib/metadata";
import { site, siteUrl } from "@/lib/site";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

const title = `${site.name} | ${site.nameKo}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: title, template: `%s | ${site.name}` },
  description: site.description,
  keywords: [
    "워싱턴DC 한인탁구협회",
    "버지니아 탁구",
    "워싱턴 DC 탁구",
    "한인 탁구",
    "탁구대회",
    "KTTA of DC",
    "Korean Table Tennis Association of DC",
  ],
  openGraph: {
    ...sharedOpenGraph,
    title,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#00529c",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
