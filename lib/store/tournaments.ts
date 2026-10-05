import "server-only";
import { randomBytes } from "node:crypto";
import type { Tournament } from "@/lib/types";
import { dataFile, mutateCollection, readCollection } from "./json-file";
import { removeUploads } from "./files";

// 대회 정보 저장소. 데이터베이스로 옮길 때는 아래 함수들의 내부만 바꾸면 됩니다.

const FILE = dataFile("tournaments.json");

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
  const tournaments = (await readCollection<Tournament>(FILE)).sort(newestFirst);
  return includeHidden ? tournaments : tournaments.filter((t) => !t.hidden);
}

export async function getTournament(
  id: string,
  options?: ReadOptions,
): Promise<Tournament | null> {
  return (await listTournaments(options)).find((t) => t.id === id) ?? null;
}

export async function createTournament(
  input: TournamentInput,
): Promise<Tournament> {
  const now = new Date().toISOString();
  return mutateCollection<Tournament, Tournament>(FILE, (items) => {
    let id: string;
    do {
      id = `${input.startDate}-${randomBytes(2).toString("hex")}`;
    } while (items.some((t) => t.id === id));
    const created: Tournament = { ...input, id, createdAt: now, updatedAt: now };
    return { items: [...items, created].sort(newestFirst), result: created };
  });
}

export async function updateTournament(
  id: string,
  input: TournamentInput,
): Promise<Tournament | null> {
  const change = await mutateCollection<
    Tournament,
    { previous: Tournament; updated: Tournament } | null
  >(FILE, (items) => {
    const previous = items.find((t) => t.id === id);
    if (!previous) return { items, result: null };
    const updated: Tournament = {
      ...input,
      id,
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    };
    return {
      items: items.map((t) => (t.id === id ? updated : t)).sort(newestFirst),
      result: { previous, updated },
    };
  });
  if (!change) return null;

  // 수정하면서 빠진 포스터·첨부 파일은 디스크에서도 지웁니다.
  const kept = new Set(uploadsOf(change.updated));
  await removeUploads(uploadsOf(change.previous).filter((url) => !kept.has(url)));
  return change.updated;
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. */
export async function setTournamentHidden(id: string, hidden: boolean): Promise<boolean> {
  const updatedAt = new Date().toISOString();
  return mutateCollection<Tournament, boolean>(FILE, (items) => ({
    items: items.map((t) =>
      // 보이는 대회에는 hidden 값을 아예 남기지 않습니다. (undefined 는 파일에 쓰이지 않습니다)
      t.id === id ? { ...t, hidden: hidden || undefined, updatedAt } : t,
    ),
    result: items.some((t) => t.id === id),
  }));
}

export async function deleteTournament(id: string): Promise<boolean> {
  const removed = await mutateCollection<Tournament, Tournament | null>(
    FILE,
    (items) => ({
      items: items.filter((t) => t.id !== id),
      result: items.find((t) => t.id === id) ?? null,
    }),
  );
  if (!removed) return false;
  await removeUploads(uploadsOf(removed));
  return true;
}
