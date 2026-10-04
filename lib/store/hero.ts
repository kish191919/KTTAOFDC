import "server-only";
import { randomBytes } from "node:crypto";
import type { HeroMedia } from "@/lib/types";
import { dataFile, mutateCollection, readCollection } from "./json-file";
import { removeUploads } from "./files";

// 홈 화면 맨 위(메인 화면)의 동영상·이미지 저장소.
// 데이터베이스로 옮길 때는 아래 함수들의 내부만 바꾸면 됩니다.

const FILE = dataFile("hero.json");

export const MAX_HERO_MEDIA = 10;

export type HeroMediaInput = Omit<HeroMedia, "id" | "createdAt">;

/** 홈 화면에 나오는 순서대로 정렬된 전체 목록 (숨긴 항목 포함) */
export async function listHeroMedia(): Promise<HeroMedia[]> {
  return readCollection<HeroMedia>(FILE);
}

/** 목록 맨 뒤에 추가합니다. 이미 한도만큼 올라가 있으면 null */
export async function addHeroMedia(input: HeroMediaInput): Promise<HeroMedia | null> {
  const now = new Date().toISOString();
  return mutateCollection<HeroMedia, HeroMedia | null>(FILE, (items) => {
    if (items.length >= MAX_HERO_MEDIA) return { items, result: null };
    let id: string;
    do {
      id = randomBytes(4).toString("hex");
    } while (items.some((item) => item.id === id));
    const created: HeroMedia = { ...input, id, createdAt: now };
    return { items: [...items, created], result: created };
  });
}

export async function setHeroMediaActive(id: string, active: boolean): Promise<boolean> {
  return mutateCollection<HeroMedia, boolean>(FILE, (items) => ({
    items: items.map((item) => (item.id === id ? { ...item, active } : item)),
    result: items.some((item) => item.id === id),
  }));
}

/** 바로 앞(-1) 또는 바로 뒤(+1) 항목과 자리를 바꿉니다. */
export async function moveHeroMedia(id: string, delta: -1 | 1): Promise<boolean> {
  return mutateCollection<HeroMedia, boolean>(FILE, (items) => {
    const index = items.findIndex((item) => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= items.length) {
      return { items, result: false };
    }
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return { items: next, result: true };
  });
}

export async function deleteHeroMedia(id: string): Promise<boolean> {
  const removed = await mutateCollection<HeroMedia, HeroMedia | null>(FILE, (items) => ({
    items: items.filter((item) => item.id !== id),
    result: items.find((item) => item.id === id) ?? null,
  }));
  if (!removed) return false;
  await removeUploads([removed.src]);
  return true;
}
