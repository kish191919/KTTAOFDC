// 사이트 전역에서 쓰는 기본 정보. 협회 이름·연락처가 바뀌면 이 파일만 고치면 됩니다.
export const site = {
  name: "KTTA of DC",
  nameKo: "버지니아 한인 탁구 협회",
  nameEn: "Korean Table Tennis Association of Virginia",
  slogan: "Table Tennis Builds a Better Community",
  description:
    "버지니아·워싱턴 DC 지역 한인 탁구인들의 모임, 버지니아 한인 탁구 협회(KTTA of DC) 홈페이지입니다. 대회 정보와 탁구 장소, 협회 소식을 확인하세요.",
  email: "kttaofva@gmail.com",
  // 대회 날짜의 '오늘' 기준이 되는 시간대
  timeZone: "America/New_York",
} as const;

export const nav = [
  { href: "/", label: "홈" },
  { href: "/about", label: "협회 소개" },
  { href: "/tournaments", label: "대회 정보" },
  { href: "/gallery", label: "갤러리" },
  { href: "/community", label: "커뮤니티" },
] as const;

/** 배포 주소. 공유 미리보기(OG)·sitemap 의 절대 주소를 만들 때 사용합니다. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
