// 사이트 전역에서 쓰는 기본 정보. 협회 이름·연락처가 바뀌면 이 파일만 고치면 됩니다.
export const site = {
  name: "KTTA of DC",
  nameKo: "워싱턴DC 한인탁구협회",
  nameEn: "Korean Table Tennis Association of DC",
  slogan: "Table Tennis Builds a Better Community",
  description:
    "버지니아·워싱턴 DC 지역 한인 탁구인들의 모임, 워싱턴DC 한인탁구협회(KTTA of DC) 홈페이지입니다. 대회 정보와 탁구 장소, 협회 소식을 확인하세요.",
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
