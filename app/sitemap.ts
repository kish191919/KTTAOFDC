import type { MetadataRoute } from "next";
import { localePath, locales } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";
import { listAlbums } from "@/lib/store/albums";
import { listNewsPosts } from "@/lib/store/news";
import { listTournaments } from "@/lib/store/tournaments";

// 새로 등록한 대회·앨범·소식이 반영되도록 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [tournaments, albums, news] = await Promise.all([
    listTournaments(),
    listAlbums(),
    listNewsPosts(),
  ]);
  // 언어 표시가 없는 주소. 아래에서 한국어(/…)와 영어(/en/…) 주소를 함께 만듭니다.
  const pages: { path: string; lastModified?: string }[] = [
    { path: "/" },
    { path: "/about" },
    { path: "/tournaments" },
    { path: "/gallery" },
    { path: "/community/news" },
    { path: "/community" },
    { path: "/community/etiquette" },
    ...tournaments.map((t) => ({ path: `/tournaments/${t.id}`, lastModified: t.updatedAt })),
    ...albums.map((album) => ({ path: `/gallery/${album.id}`, lastModified: album.updatedAt })),
    ...news.map((post) => ({
      path: `/community/news/${post.id}`,
      lastModified: post.updatedAt,
    })),
  ];

  const absolute = (path: string) => `${base}${path === "/" ? "" : path}`;

  return pages.flatMap(({ path, lastModified }) => {
    // 같은 페이지의 한국어·영어 주소를 서로 짝지어 알려 줍니다.
    const languages = Object.fromEntries(
      locales.map((lang) => [lang, absolute(localePath(lang, path))]),
    );
    return locales.map((lang) => ({
      url: absolute(localePath(lang, path)),
      ...(lastModified ? { lastModified } : {}),
      alternates: { languages },
    }));
  });
}
