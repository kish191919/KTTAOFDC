import "server-only";
import { randomBytes } from "node:crypto";
import type { HeroMedia } from "@/lib/types";
import { fail, insertItem, readAll, readOne, removeItem, replaceItem } from "./db";
import { removeUploads } from "./files";
import { database } from "./supabase";

// 홈 화면 맨 위(메인 화면)의 동영상·이미지 저장소. Supabase 의 hero_media 테이블을 씁니다.
// 홈 화면에 나오는 순서는 position 칸에 적혀 있고, 작은 것부터 나옵니다.

const TABLE = "hero_media";

export const MAX_HERO_MEDIA = 10;

export type HeroMediaInput = Omit<HeroMedia, "id" | "createdAt">;

/** 홈 화면에 나오는 순서대로 정렬된 전체 목록 (숨긴 항목 포함) */
export async function listHeroMedia(): Promise<HeroMedia[]> {
  return readAll<HeroMedia>(TABLE, "position");
}

/** 홈 화면에 나오는 순서대로 정렬된 id 와 순서 번호 */
async function readPositions(): Promise<{ id: string; position: number }[]> {
  const { data, error } = await database().from(TABLE).select("id, position").order("position");
  if (error) fail(TABLE, error);
  return data;
}

async function setPosition(id: string, position: number): Promise<void> {
  const { error } = await database().from(TABLE).update({ position }).eq("id", id);
  if (error) fail(TABLE, error);
}

/** 목록 맨 뒤에 추가합니다. 이미 한도만큼 올라가 있으면 null */
export async function addHeroMedia(input: HeroMediaInput): Promise<HeroMedia | null> {
  const now = new Date().toISOString();
  const rows = await readPositions();
  if (rows.length >= MAX_HERO_MEDIA) return null;
  const position = (rows.at(-1)?.position ?? 0) + 1;
  for (;;) {
    const created: HeroMedia = { ...input, id: randomBytes(4).toString("hex"), createdAt: now };
    // 같은 id 가 이미 있으면 다른 id 로 다시 넣습니다.
    if (await insertItem(TABLE, created, { position })) return created;
  }
}

export async function setHeroMediaActive(id: string, active: boolean): Promise<boolean> {
  const item = await readOne<HeroMedia>(TABLE, id);
  if (!item) return false;
  return replaceItem(TABLE, { ...item, active });
}

/** 바로 앞(-1) 또는 바로 뒤(+1) 항목과 자리를 바꿉니다. */
export async function moveHeroMedia(id: string, delta: -1 | 1): Promise<boolean> {
  const rows = await readPositions();
  const index = rows.findIndex((row) => row.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= rows.length) return false;
  // 두 항목의 순서 번호를 맞바꿉니다.
  await setPosition(rows[index].id, rows[target].position);
  await setPosition(rows[target].id, rows[index].position);
  return true;
}

export async function deleteHeroMedia(id: string): Promise<boolean> {
  const removed = await removeItem<HeroMedia>(TABLE, id);
  if (!removed) return false;
  await removeUploads([removed.src]);
  return true;
}
