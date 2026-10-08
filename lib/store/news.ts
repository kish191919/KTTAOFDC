import "server-only";
import { randomBytes } from "node:crypto";
import type { NewsPost } from "@/lib/types";
import { insertItem, readAll, readOne, removeItem, replaceItem } from "./db";
import { removeUploads } from "./files";

// 탁구 소식 저장소. Supabase 의 news_posts 테이블을 씁니다.

const TABLE = "news_posts";

export type NewsPostInput = Omit<NewsPost, "id" | "createdAt" | "updatedAt">;

const newestFirst = (a: NewsPost, b: NewsPost) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

const uploadsOf = (post: Pick<NewsPost, "images" | "attachments">) => [
  ...post.images.map((image) => image.src),
  ...post.attachments.map((file) => file.url),
];

/** 관리자 화면처럼 숨긴 소식까지 읽어야 할 때 `{ includeHidden: true }` 를 줍니다. */
type ReadOptions = { includeHidden?: boolean };

/** 최근 소식이 먼저 오도록 정렬된 목록. 숨긴 소식은 따로 요청하지 않으면 빠집니다. */
export async function listNewsPosts({ includeHidden = false }: ReadOptions = {}): Promise<
  NewsPost[]
> {
  const posts = (await readAll<NewsPost>(TABLE)).sort(newestFirst);
  return includeHidden ? posts : posts.filter((post) => !post.hidden);
}

export async function getNewsPost(
  id: string,
  { includeHidden = false }: ReadOptions = {},
): Promise<NewsPost | null> {
  const post = await readOne<NewsPost>(TABLE, id);
  return post && (includeHidden || !post.hidden) ? post : null;
}

export async function createNewsPost(input: NewsPostInput): Promise<NewsPost> {
  const now = new Date().toISOString();
  for (;;) {
    const id = `${input.date}-${randomBytes(2).toString("hex")}`;
    const created: NewsPost = { ...input, id, createdAt: now, updatedAt: now };
    // 같은 id 가 이미 있으면 다른 id 로 다시 넣습니다.
    if (await insertItem(TABLE, created)) return created;
  }
}

export async function updateNewsPost(
  id: string,
  input: NewsPostInput,
): Promise<NewsPost | null> {
  const previous = await readOne<NewsPost>(TABLE, id);
  if (!previous) return null;
  const updated: NewsPost = {
    ...input,
    id,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (!(await replaceItem(TABLE, updated))) return null;

  // 수정하면서 빠진 이미지·첨부 파일은 저장소에서도 지웁니다.
  const kept = new Set(uploadsOf(updated));
  await removeUploads(uploadsOf(previous).filter((url) => !kept.has(url)));
  return updated;
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. */
export async function setNewsPostHidden(id: string, hidden: boolean): Promise<boolean> {
  const post = await readOne<NewsPost>(TABLE, id);
  if (!post) return false;
  return replaceItem(TABLE, {
    ...post,
    // 보이는 소식에는 hidden 값을 아예 남기지 않습니다. (undefined 는 저장되지 않습니다)
    hidden: hidden || undefined,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteNewsPost(id: string): Promise<boolean> {
  const removed = await removeItem<NewsPost>(TABLE, id);
  if (!removed) return false;
  await removeUploads(uploadsOf(removed));
  return true;
}
