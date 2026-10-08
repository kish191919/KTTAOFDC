import "server-only";
import { randomBytes } from "node:crypto";
import type { Album } from "@/lib/types";
import { insertItem, readAll, readOne, removeItem, replaceItem } from "./db";
import { removeUploads } from "./files";

// 사진첩(앨범) 저장소. Supabase 의 albums 테이블을 씁니다.

const TABLE = "albums";

export type AlbumInput = Omit<Album, "id" | "createdAt" | "updatedAt">;

const newestFirst = (a: Album, b: Album) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

/** 관리자 화면처럼 숨긴 앨범까지 읽어야 할 때 `{ includeHidden: true }` 를 줍니다. */
type ReadOptions = { includeHidden?: boolean };

/** 최근 행사가 먼저 오도록 정렬된 목록. 숨긴 앨범은 따로 요청하지 않으면 빠집니다. */
export async function listAlbums({ includeHidden = false }: ReadOptions = {}): Promise<Album[]> {
  const albums = (await readAll<Album>(TABLE)).sort(newestFirst);
  return includeHidden ? albums : albums.filter((album) => !album.hidden);
}

export async function getAlbum(
  id: string,
  { includeHidden = false }: ReadOptions = {},
): Promise<Album | null> {
  const album = await readOne<Album>(TABLE, id);
  return album && (includeHidden || !album.hidden) ? album : null;
}

export async function createAlbum(input: AlbumInput): Promise<Album> {
  const now = new Date().toISOString();
  for (;;) {
    const id = `${input.date}-${randomBytes(2).toString("hex")}`;
    const created: Album = { ...input, id, createdAt: now, updatedAt: now };
    // 같은 id 가 이미 있으면 다른 id 로 다시 넣습니다.
    if (await insertItem(TABLE, created)) return created;
  }
}

export async function updateAlbum(
  id: string,
  input: AlbumInput,
): Promise<Album | null> {
  const previous = await readOne<Album>(TABLE, id);
  if (!previous) return null;
  const updated: Album = {
    ...input,
    id,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (!(await replaceItem(TABLE, updated))) return null;

  // 수정하면서 빠진 사진은 저장소에서도 지웁니다.
  const kept = new Set(updated.photos.map((photo) => photo.src));
  await removeUploads(
    previous.photos.map((photo) => photo.src).filter((src) => !kept.has(src)),
  );
  return updated;
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. */
export async function setAlbumHidden(id: string, hidden: boolean): Promise<boolean> {
  const album = await readOne<Album>(TABLE, id);
  if (!album) return false;
  return replaceItem(TABLE, {
    ...album,
    // 보이는 앨범에는 hidden 값을 아예 남기지 않습니다. (undefined 는 저장되지 않습니다)
    hidden: hidden || undefined,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteAlbum(id: string): Promise<boolean> {
  const removed = await removeItem<Album>(TABLE, id);
  if (!removed) return false;
  await removeUploads(removed.photos.map((photo) => photo.src));
  return true;
}
