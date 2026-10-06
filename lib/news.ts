import { formatDate } from "@/lib/dates";
import type { Locale } from "@/lib/i18n/config";
import type { NewsPost } from "@/lib/types";

/** 목록에 보여 줄 본문 앞부분. 줄바꿈과 이어진 빈칸은 한 칸으로 줄입니다. */
export function excerptOf(post: Pick<NewsPost, "body">, max = 200): string {
  const flat = (post.body ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

/** 링크 미리보기·RSS 에 쓰는 한 줄 설명: "2026년 10월 5일 (월) · 한국일보 · 본문 앞부분" */
export function newsSummary(
  post: Pick<NewsPost, "date" | "source" | "body">,
  lang: Locale = "ko",
): string {
  return [formatDate(post.date, true, lang), post.source, excerptOf(post, 120)]
    .filter(Boolean)
    .join(" · ");
}
