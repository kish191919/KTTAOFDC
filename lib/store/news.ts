import "server-only";
import { randomBytes } from "node:crypto";
import type { NewsPost } from "@/lib/types";
import { dataFile, mutateCollection, readCollection } from "./json-file";
import { removeUploads } from "./files";

// 탁구 소식 저장소. 데이터베이스로 옮길 때는 아래 함수들의 내부만 바꾸면 됩니다.

const FILE = dataFile("news.json");

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
  const posts = (await readCollection<NewsPost>(FILE)).sort(newestFirst);
  return includeHidden ? posts : posts.filter((post) => !post.hidden);
}

export async function getNewsPost(id: string, options?: ReadOptions): Promise<NewsPost | null> {
  return (await listNewsPosts(options)).find((post) => post.id === id) ?? null;
}

export async function createNewsPost(input: NewsPostInput): Promise<NewsPost> {
  const now = new Date().toISOString();
  return mutateCollection<NewsPost, NewsPost>(FILE, (items) => {
    let id: string;
    do {
      id = `${input.date}-${randomBytes(2).toString("hex")}`;
    } while (items.some((post) => post.id === id));
    const created: NewsPost = { ...input, id, createdAt: now, updatedAt: now };
    return { items: [...items, created].sort(newestFirst), result: created };
  });
}

export async function updateNewsPost(
  id: string,
  input: NewsPostInput,
): Promise<NewsPost | null> {
  const change = await mutateCollection<
    NewsPost,
    { previous: NewsPost; updated: NewsPost } | null
  >(FILE, (items) => {
    const previous = items.find((post) => post.id === id);
    if (!previous) return { items, result: null };
    const updated: NewsPost = {
      ...input,
      id,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return {
      items: items.map((post) => (post.id === id ? updated : post)).sort(newestFirst),
      result: { previous, updated },
    };
  });
  if (!change) return null;

  // 수정하면서 빠진 이미지·첨부 파일은 디스크에서도 지웁니다.
  const kept = new Set(uploadsOf(change.updated));
  await removeUploads(uploadsOf(change.previous).filter((url) => !kept.has(url)));
  return change.updated;
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. */
export async function setNewsPostHidden(id: string, hidden: boolean): Promise<boolean> {
  const updatedAt = new Date().toISOString();
  return mutateCollection<NewsPost, boolean>(FILE, (items) => ({
    items: items.map((post) =>
      // 보이는 소식에는 hidden 값을 아예 남기지 않습니다. (undefined 는 파일에 쓰이지 않습니다)
      post.id === id ? { ...post, hidden: hidden || undefined, updatedAt } : post,
    ),
    result: items.some((post) => post.id === id),
  }));
}

export async function deleteNewsPost(id: string): Promise<boolean> {
  const removed = await mutateCollection<NewsPost, NewsPost | null>(FILE, (items) => ({
    items: items.filter((post) => post.id !== id),
    result: items.find((post) => post.id === id) ?? null,
  }));
  if (!removed) return false;
  await removeUploads(uploadsOf(removed));
  return true;
}
