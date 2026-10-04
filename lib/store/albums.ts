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

/** 최근 행사가 먼저 오도록 정렬된 전체 목록 */
export async function listAlbums(): Promise<Album[]> {
  return (await readCollection<Album>(FILE)).sort(newestFirst);
}

export async function getAlbum(id: string): Promise<Album | null> {
  return (await listAlbums()).find((album) => album.id === id) ?? null;
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

export async function deleteAlbum(id: string): Promise<boolean> {
  const removed = await mutateCollection<Album, Album | null>(FILE, (items) => ({
    items: items.filter((album) => album.id !== id),
    result: items.find((album) => album.id === id) ?? null,
  }));
  if (!removed) return false;
  await removeUploads(removed.photos.map((photo) => photo.src));
  return true;
}
