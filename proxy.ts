import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 언어별 주소 규칙. 페이지는 모두 app/[lang]/ 아래에 있습니다.
//   /about      → 한국어 (안에서만 /ko/about 으로 연결하고, 주소창은 그대로 둡니다)
//   /en/about   → 영어
//   /ko/about   → /about 으로 이동 (같은 화면이 두 주소로 열리지 않게)
// 관리자 화면은 한국어만 있으므로 /en/admin 은 /admin 으로 돌려보냅니다.

const withoutPrefix = (pathname: string, prefix: string) =>
  pathname.slice(prefix.length) || "/";

const startsWith = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  if (startsWith(pathname, "/en")) {
    if (!startsWith(pathname, "/en/admin")) return NextResponse.next();
    url.pathname = withoutPrefix(pathname, "/en");
    return NextResponse.redirect(url);
  }

  if (startsWith(pathname, "/ko")) {
    url.pathname = withoutPrefix(pathname, "/ko");
    return NextResponse.redirect(url);
  }

  url.pathname = pathname === "/" ? "/ko" : `/ko${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // API, Next.js 내부 파일, 확장자가 있는 파일(이미지·rss.xml·sitemap.xml 등)은 건드리지 않습니다.
  matcher: ["/((?!api/|_next/|.*\\.[\\w]+$).*)"],
};
