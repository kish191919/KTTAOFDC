import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";

/** 페이지·레이아웃의 params 에서 언어를 꺼냅니다. 지원하지 않는 값이면 404 화면으로 보냅니다. */
export async function readLang(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}
