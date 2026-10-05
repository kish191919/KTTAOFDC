import type { MetadataRoute } from "next";
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
  const pages = [
    "",
    "/about",
    "/tournaments",
    "/gallery",
    "/community/news",
    "/community",
    "/community/etiquette",
  ];
  return [
    ...pages.map((path) => ({ url: `${base}${path}` })),
    ...tournaments.map((t) => ({
      url: `${base}/tournaments/${t.id}`,
      lastModified: t.updatedAt,
    })),
    ...albums.map((album) => ({
      url: `${base}/gallery/${album.id}`,
      lastModified: album.updatedAt,
    })),
    ...news.map((post) => ({
      url: `${base}/community/news/${post.id}`,
      lastModified: post.updatedAt,
    })),
  ];
}
