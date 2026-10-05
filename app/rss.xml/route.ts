import { formatSchedule } from "@/lib/dates";
import { newsSummary } from "@/lib/news";
import { site, siteUrl } from "@/lib/site";
import { listNewsPosts } from "@/lib/store/news";
import { listTournaments } from "@/lib/store/tournaments";

// 새로 등록한 대회·소식이 반영되도록 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

/** 피드에 담는 글 수 (최근에 등록한 것부터) */
const MAX_ITEMS = 30;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 대회 정보·탁구 소식 RSS 피드. 네이버 서치어드바이저 등에 이 주소(/rss.xml)를 제출할 수 있습니다. */
export async function GET() {
  const base = siteUrl();
  const [tournaments, news] = await Promise.all([listTournaments(), listNewsPosts()]);

  const entries = [
    ...tournaments.map((tournament) => ({
      title: tournament.title,
      link: `${base}/tournaments/${tournament.id}`,
      createdAt: tournament.createdAt,
      description: [
        formatSchedule(tournament),
        tournament.venue || tournament.address,
        tournament.summary,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
    ...news.map((post) => ({
      title: post.title,
      link: `${base}/community/news/${post.id}`,
      createdAt: post.createdAt,
      description: newsSummary(post),
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ITEMS);

  const items = entries
    .map(
      (entry) => `    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${entry.link}</link>
      <guid>${entry.link}</guid>
      <pubDate>${new Date(entry.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${site.name} | ${site.nameKo}`)}</title>
    <link>${base}</link>
    <description>${escapeXml(site.description)}</description>
    <language>ko</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
