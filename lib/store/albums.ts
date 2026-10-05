import "server-only";
import { randomBytes } from "node:crypto";
import type { Album } from "@/lib/types";
import { dataFile, mutateCollection, readCollection } from "./json-file";
import { removeUploads } from "./files";

// 사진첩(앨범) 저장소. 데이터베이스로 옮길 때는 아래 함수들의 내부만 바꾸면 됩니다.

const FILE = dataFile("albums.json");

export type AlbumInput = Omit<Album, "id" | "createdAt" | "updatedAt">;

const newestFirst = (a: Album, b: Album) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

/** 관리자 화면처럼 숨긴 앨범까지 읽어야 할 때 `{ includeHidden: true }` 를 줍니다. */
type ReadOptions = { includeHidden?: boolean };

/** 최근 행사가 먼저 오도록 정렬된 목록. 숨긴 앨범은 따로 요청하지 않으면 빠집니다. */
export async function listAlbums({ includeHidden = false }: ReadOptions = {}): Promise<Album[]> {
  const albums = (await readCollection<Album>(FILE)).sort(newestFirst);
  return includeHidden ? albums : albums.filter((album) => !album.hidden);
}

export async function getAlbum(id: string, options?: ReadOptions): Promise<Album | null> {
  return (await listAlbums(options)).find((album) => album.id === id) ?? null;
}

export async function createAlbum(input: AlbumInput): Promise<Album> {
  const now = new Date().toISOString();
  return mutateCollection<Album, Album>(FILE, (items) => {
    let id: string;
    do {
      id = `${input.date}-${randomBytes(2).toString("hex")}`;
    } while (items.some((album) => album.id === id));
    const created: Album = { ...input, id, createdAt: now, updatedAt: now };
    return { items: [...items, created].sort(newestFirst), result: created };
  });
}

export async function updateAlbum(
  id: string,
  input: AlbumInput,
): Promise<Album | null> {
  const change = await mutateCollection<
    Album,
    { previous: Album; updated: Album } | null
  >(FILE, (items) => {
    const previous = items.find((album) => album.id === id);
    if (!previous) return { items, result: null };
    const updated: Album = {
      ...input,
      id,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return {
      items: items
        .map((album) => (album.id === id ? updated : album))
        .sort(newestFirst),
      result: { previous, updated },
    };
  });
  if (!change) return null;

  // 수정하면서 빠진 사진은 디스크에서도 지웁니다.
  const kept = new Set(change.updated.photos.map((photo) => photo.src));
  await removeUploads(
    change.previous.photos
      .map((photo) => photo.src)
      .filter((src) => !kept.has(src)),
  );
  return change.updated;
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. */
export async function setAlbumHidden(id: string, hidden: boolean): Promise<boolean> {
  const updatedAt = new Date().toISOString();
  return mutateCollection<Album, boolean>(FILE, (items) => ({
    items: items.map((album) =>
      // 보이는 앨범에는 hidden 값을 아예 남기지 않습니다. (undefined 는 파일에 쓰이지 않습니다)
      album.id === id ? { ...album, hidden: hidden || undefined, updatedAt } : album,
    ),
    result: items.some((album) => album.id === id),
  }));
}

export async function deleteAlbum(id: string): Promise<boolean> {
  const removed = await mutateCollection<Album, Album | null>(FILE, (items) => ({
    items: items.filter((album) => album.id !== id),
    result: items.find((album) => album.id === id) ?? null,
  }));
  if (!removed) return false;
  await removeUploads(removed.photos.map((photo) => photo.src));
  return true;
}
