import type { Metadata } from "next";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { site } from "@/lib/site";
import type { ImageRef } from "@/lib/types";

const OG_LOCALE: Record<Locale, string> = { ko: "ko_KR", en: "en_US" };

/** 카카오톡·SNS 에 링크를 붙였을 때 보이는 미리보기의 공통 정보 */
export function sharedOpenGraph(lang: Locale) {
  return {
    type: "website",
    locale: OG_LOCALE[lang],
    siteName: site.name,
  } as const;
}

/**
 * 검색 사이트에 같은 페이지의 한국어·영어 주소를 짝지어 알려 줍니다.
 * path 는 "/about" 처럼 언어 표시가 없는 주소입니다.
 */
export function languageAlternates(lang: Locale, path: string) {
  return {
    canonical: localePath(lang, path),
    languages: {
      ko: localePath("ko", path),
      en: localePath("en", path),
      "x-default": localePath("ko", path),
    },
    // RSS 리더와 검색 사이트가 대회 소식 피드(/rss.xml)를 찾을 수 있게 알려 줍니다.
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: getDictionary(lang).site.rssTitle }],
    },
  };
}

// 대표 이미지가 없는 페이지는 사이트 배너(app/opengraph-image.jpg)를 미리보기로 씁니다.
const DEFAULT_IMAGE = { url: "/opengraph-image.jpg", width: 1200, height: 630 };

/** 페이지 제목·설명과 링크 미리보기 정보를 한 번에 만듭니다. */
export function pageMetadata({
  lang,
  path,
  title,
  description,
  image,
}: {
  lang: Locale;
  /** 언어 표시가 없는 이 페이지의 주소 (예: "/tournaments") */
  path: string;
  title: string;
  description: string;
  image?: ImageRef;
}): Metadata {
  const preview = image
    ? {
        url: image.src,
        ...(image.width && image.height
          ? { width: image.width, height: image.height }
          : {}),
      }
    : DEFAULT_IMAGE;
  return {
    title,
    description,
    alternates: languageAlternates(lang, path),
    openGraph: {
      ...sharedOpenGraph(lang),
      title: `${title} | ${site.name}`,
      description,
      images: [preview],
    },
  };
}
