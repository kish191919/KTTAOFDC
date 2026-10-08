import "server-only";
import { randomBytes } from "node:crypto";
import type { Tournament } from "@/lib/types";
import { insertItem, readAll, readOne, removeItem, replaceItem } from "./db";
import { removeUploads } from "./files";

// 대회 정보 저장소. Supabase 의 tournaments 테이블을 씁니다.

const TABLE = "tournaments";

export type TournamentInput = Omit<Tournament, "id" | "createdAt" | "updatedAt">;

const sortKey = (t: Tournament) => `${t.startDate}T${t.startTime ?? "00:00"}`;
const newestFirst = (a: Tournament, b: Tournament) =>
  sortKey(b).localeCompare(sortKey(a));

const uploadsOf = (t: Pick<Tournament, "images" | "attachments">) => [
  ...t.images.map((image) => image.src),
  ...t.attachments.map((file) => file.url),
];

/** 관리자 화면처럼 숨긴 대회까지 읽어야 할 때 `{ includeHidden: true }` 를 줍니다. */
type ReadOptions = { includeHidden?: boolean };

/** 최신 대회가 먼저 오도록 정렬된 목록. 숨긴 대회는 따로 요청하지 않으면 빠집니다. */
export async function listTournaments({ includeHidden = false }: ReadOptions = {}): Promise<
  Tournament[]
> {
  const tournaments = (await readAll<Tournament>(TABLE)).sort(newestFirst);
  return includeHidden ? tournaments : tournaments.filter((t) => !t.hidden);
}

export async function getTournament(
  id: string,
  { includeHidden = false }: ReadOptions = {},
): Promise<Tournament | null> {
  const tournament = await readOne<Tournament>(TABLE, id);
  return tournament && (includeHidden || !tournament.hidden) ? tournament : null;
}

export async function createTournament(
  input: TournamentInput,
): Promise<Tournament> {
  const now = new Date().toISOString();
  for (;;) {
    const id = `${input.startDate}-${randomBytes(2).toString("hex")}`;
    const created: Tournament = { ...input, id, createdAt: now, updatedAt: now };
    // 같은 id 가 이미 있으면 다른 id 로 다시 넣습니다.
    if (await insertItem(TABLE, created)) return created;
  }
}

export async function updateTournament(
  id: string,
  input: TournamentInput,
): Promise<Tournament | null> {
  const previous = await readOne<Tournament>(TABLE, id);
  if (!previous) return null;
  const updated: Tournament = {
    ...input,
    id,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (!(await replaceItem(TABLE, updated))) return null;

  // 수정하면서 빠진 포스터·첨부 파일은 저장소에서도 지웁니다.
  const kept = new Set(uploadsOf(updated));
  await removeUploads(uploadsOf(previous).filter((url) => !kept.has(url)));
  return updated;
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. */
export async function setTournamentHidden(id: string, hidden: boolean): Promise<boolean> {
  const tournament = await readOne<Tournament>(TABLE, id);
  if (!tournament) return false;
  return replaceItem(TABLE, {
    ...tournament,
    // 보이는 대회에는 hidden 값을 아예 남기지 않습니다. (undefined 는 저장되지 않습니다)
    hidden: hidden || undefined,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTournament(id: string): Promise<boolean> {
  const removed = await removeItem<Tournament>(TABLE, id);
  if (!removed) return false;
  await removeUploads(uploadsOf(removed));
  return true;
}
