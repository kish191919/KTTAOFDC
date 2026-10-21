import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { personKey } from "@/lib/draw/roster";
import type { Game, GamePerson } from "@/lib/types";
import {
  insertItem,
  readAll,
  readContaining,
  readLatest,
  readOne,
  removeItem,
  replaceItemIf,
  upsertItems,
} from "./db";

// 번개 게임 저장소. Supabase 의 games 테이블에 게임 하나가 한 줄로 들어갑니다.
// 게임에 쓴 이름은 game_people 테이블에 한 사람씩 모아 두어, 다음 게임에서 찾아 바로 넣을 수 있게 합니다.
// 대진표처럼 여러 사람이 동시에 점수를 넣으므로, 읽은 뒤 그 사이 바뀌지 않았을 때만 저장합니다. (lib/store/draws.ts 와 같은 방식)

const TABLE = "games";
const PEOPLE = "game_people";
const ATTEMPTS = 6;

/** 공유 주소에 쓰는 글자. 헷갈리기 쉬운 0 · o · 1 · l · i 는 뺍니다. */
const ID_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 6;

/** 만든 사람 열쇠. 만든 휴대폰에만 남기고, 저장소에는 해시만 둡니다. */
export const newOwnerKey = () => randomBytes(18).toString("base64url");
export const hashOwnerKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** 열쇠가 그 게임을 만든 사람의 것인지 */
export const ownsGame = (game: Pick<Game, "ownerKeyHash">, key: unknown) =>
  typeof key === "string" && key.length > 0 && hashOwnerKey(key) === game.ownerKeyHash;

export async function getGame(id: string): Promise<Game | null> {
  return readOne<Game>(TABLE, id);
}

/** 최근에 만든 게임부터 limit 개 */
export async function listRecentGames(limit: number): Promise<Game[]> {
  return readLatest<Game>(TABLE, "createdAt", limit);
}

/** 그 이름의 선수가 나온 게임. 최근에 만든 게임부터 */
export async function listGamesWith(name: string): Promise<Game[]> {
  const games = await readContaining<Game>(TABLE, "keys", personKey(name));
  return games.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

/** 모든 게임 (관리 화면). 최근에 만든 게임부터 */
export async function listAllGames(): Promise<Game[]> {
  return (await readAll<Game>(TABLE)).sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

/** 새 게임을 넣습니다. build 는 정해진 id 로 게임을 만들고, 같은 id 가 이미 있으면 다른 id 로 다시 부릅니다. */
export async function createGame<E extends object>(
  build: (id: string) => { game: Game } | E,
): Promise<{ game: Game } | E> {
  for (;;) {
    const id = Array.from({ length: ID_LENGTH }, () => ID_CHARS[randomInt(ID_CHARS.length)]).join("");
    const result = build(id);
    if (!("game" in result)) return result;
    if (await insertItem(TABLE, result.game)) return result;
  }
}

/**
 * 게임을 고칩니다. change 는 지금 저장된 게임을 받아 바꾼 게임이나 오류를 돌려줍니다.
 * 동시에 다른 사람이 먼저 저장했으면 새 내용으로 change 를 다시 부릅니다.
 * 게임이 없으면 null, 끝내 저장하지 못하면 { busy: true } 입니다.
 */
export async function changeGame<E extends object>(
  id: string,
  change: (game: Game) => { game: Game } | E,
): Promise<{ game: Game } | E | { busy: true } | null> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const current = await getGame(id);
    if (!current) return null;
    const result = change(current);
    if (!("game" in result)) return result;
    // 바뀐 것이 없으면 저장하지 않습니다.
    if (result.game === current) return { game: current };
    const saved: Game = {
      ...result.game,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    if (await replaceItemIf(TABLE, saved, "version", String(current.version))) {
      return { game: saved };
    }
    await new Promise((resolve) => setTimeout(resolve, 40 + Math.random() * 120));
  }
  return { busy: true };
}

export async function deleteGame(id: string): Promise<boolean> {
  return (await removeItem(TABLE, id)) !== null;
}

// ───────────────────────── 이름 모음 ─────────────────────────

/** 저장해 둔 이름. 최근에 쓴 이름부터 */
export async function listPeople(): Promise<GamePerson[]> {
  return (await readAll<GamePerson>(PEOPLE)).sort((x, y) => y.lastUsedAt.localeCompare(x.lastUsedAt));
}

/** 게임에 쓴 이름을 모아 둡니다. 이미 있는 이름은 마지막으로 쓴 때와 적은 모양(띄어쓰기 등)을 새로 고칩니다. */
export async function rememberPeople(names: string[], now: string): Promise<void> {
  const people = new Map<string, GamePerson>();
  for (const name of names) {
    const id = personKey(name);
    if (id) people.set(id, { id, name, lastUsedAt: now });
  }
  await upsertItems(PEOPLE, [...people.values()]);
}

export async function forgetPerson(id: string): Promise<boolean> {
  return (await removeItem(PEOPLE, id)) !== null;
}
