// 사이트 전역에서 쓰는 기본 정보. 협회 이름·연락처가 바뀌면 이 파일만 고치면 됩니다.
export const site = {
  name: "KTTA of DC",
  nameKo: "워싱턴DC 한인탁구협회",
  nameEn: "Korean Table Tennis Association of DC",
  slogan: "Table Tennis Builds a Better Community",
  description: {
    ko: "버지니아·워싱턴 DC 지역 한인 탁구인들의 모임, 워싱턴DC 한인탁구협회(KTTA of DC) 홈페이지입니다. 대회 정보와 탁구 장소, 협회 소식을 확인하세요.",
    en: "The Korean Table Tennis Association of DC (KTTA of DC) brings together Korean American table tennis players across Virginia and the Washington, DC area. Find tournaments, places to play, and association news.",
  },
  email: "kttaofdc@gmail.com",
  // 대회 날짜의 '오늘' 기준이 되는 시간대
  timeZone: "America/New_York",
} as const;

/**
 * 검색 사이트에 이 홈페이지의 주인임을 확인해 주는 코드. 발급받은 값을 따옴표 안에 넣습니다.
 * Google Search Console · 네이버 서치어드바이저의 'HTML 태그' 인증에서
 * <meta name="..." content="이 부분" /> 의 content 값입니다. 비워 두면 태그가 나가지 않습니다.
 */
export const verification = {
  google: "",
  naver: "",
};

// href 는 언어 표시가 없는 주소입니다. 화면에서는 localePath() 로 언어에 맞는 주소를 만듭니다.
export const nav = [
  { href: "/", label: { ko: "홈", en: "Home" } },
  { href: "/about", label: { ko: "협회 소개", en: "About" } },
  { href: "/tournaments", label: { ko: "대회 정보", en: "Tournaments" } },
  { href: "/gallery", label: { ko: "갤러리", en: "Gallery" } },
  { href: "/community", label: { ko: "커뮤니티", en: "Community" } },
] as const;

/** 배포 주소. 공유 미리보기(OG)·sitemap 의 절대 주소를 만들 때 사용합니다. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
