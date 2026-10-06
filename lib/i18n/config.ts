// 홈페이지가 지원하는 언어와 주소 규칙.
// 한국어는 접두사 없이(/about), 영어는 /en 을 붙여(/en/about) 보여 줍니다.

export const locales = ["ko", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

export const isLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** 한국어와 영어를 나란히 적어 두는 글 한 덩어리. 화면에서는 value[lang] 으로 꺼내 씁니다. */
export type Localized<T = string> = Record<Locale, T>;

/** 주소 맨 앞의 언어 표시(/ko, /en)를 떼어 냅니다. "/en/about" → "/about", "/en" → "/" */
export function stripLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/** 주소가 가리키는 언어. 접두사가 없으면 한국어입니다. */
export function localeOfPath(pathname: string): Locale {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : defaultLocale;
}

/** 언어에 맞는 주소. path 는 "/about" 처럼 언어 표시가 없는 주소로 줍니다. */
export function localePath(lang: Locale, path: string): string {
  if (lang === defaultLocale) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}
