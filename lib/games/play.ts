import { addDays, dateOf } from "@/lib/dates";
import {
  eventContext,
  gamesToWin,
  readScore,
  type ScoreInput,
  type Side,
} from "@/lib/draw/play";
import { personKey } from "@/lib/draw/roster";
import { roundRobin } from "@/lib/draw/setup";
import type { DrawEvent, Game, GameMatch } from "@/lib/types";

// 번개 게임의 계산: 새 게임 만들기, 점수·경기 기록, 테이블, 순위.
// 서버(저장할 때)와 브라우저(화면을 그릴 때)가 같은 함수를 씁니다.
// 리그전 순위는 대회 대진표와 같은 규칙(lib/draw/play.ts 의 standings)으로 정합니다.

export const GAME_BEST_OF = [3, 5, 7];
export const MAX_GAME_TABLES = 20;
/** 리그전 참가자(팀) 수. 16팀이면 120경기입니다. */
export const MAX_LEAGUE_ENTRIES = 16;
export const MIN_LEAGUE_ENTRIES = 3;
export const MAX_GAME_PLAYERS = 64;
export const MAX_GAME_MATCHES = 400;
export const MAX_GAME_TITLE = 60;
export const MAX_GAME_NAME = 40;
/** 마지막으로 기록한 뒤 이만큼(일) 지나면 저절로 마감되어, 만든 사람 말고는 고칠 수 없습니다. */
export const OPEN_DAYS = 7;

/** 브라우저로 보내는 게임. 만든 사람 열쇠의 해시를 뺍니다. */
export type PublicGame = Omit<Game, "ownerKeyHash">;

export function publicGame(game: Game): PublicGame {
  const copy: Partial<Game> = { ...game };
  delete copy.ownerKeyHash;
  return copy as PublicGame;
}

/** 게임 화면이 받는 내용 (app/api/games/[id]) */
export type GamePayload = {
  game: PublicGame;
  /** 방문자가 지금 기록할 수 있는지 */
  open: boolean;
};

/** 방문자가 기록할 수 있는지. 만든 사람이 마감했거나 마지막 기록 뒤 OPEN_DAYS 가 지나면 닫힙니다. */
export const isGameOpen = (game: Pick<Game, "closed" | "updatedAt">, today: string) =>
  !game.closed && today <= addDays(dateOf(game.updatedAt), OPEN_DAYS);

/** 게임 조작이 거절된 까닭. 화면에서 언어에 맞는 문구로 바꿉니다. (사전의 games.errors) */
export type GameError =
  | "notFound"
  | "closed"
  /** 만든 사람만 할 수 있는 일 */
  | "owner"
  | "conflict"
  | "points"
  | "sets"
  | "title"
  | "names"
  | "duplicate"
  | "tooMany"
  | "tooFew"
  | "tableTaken"
  | "playerBusy"
  | "invalid"
  /** 동시에 입력한 사람이 많아 저장하지 못한 경우 (다시 누르면 됩니다) */
  | "busy"
  /** 짧은 시간에 게임을 너무 많이 만든 경우 */
  | "tooFast";

// ───────────────────────── 이름 ─────────────────────────

export const cleanGameName = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_GAME_NAME) : "";

type Roster = Pick<Game, "players">;

export const playerName = (game: Roster, id: string) =>
  game.players.find((p) => p.id === id)?.name ?? "?";

/** 한쪽 이름. 복식은 "홍길동 · 김철수" (점 앞은 줄바꿈 없는 칸) */
export const sideName = (game: Roster, side: string[]) =>
  side.map((id) => playerName(game, id)).join(" · ");

/** 리그전 팀·순위표 줄을 가리키는 글 */
export const sideKey = (side: string[]) => side.join("+");

/** 이름으로 게임을 찾을 때 쓰는 목록 */
export const keysOf = (game: Roster) => [...new Set(game.players.map((p) => personKey(p.name)))];

const nextId = (prefix: string, ids: string[]) =>
  `${prefix}${Math.max(0, ...ids.map((id) => Number(id.slice(prefix.length)) || 0)) + 1}`;

/**
 * 이름들을 선수 id 로 바꿉니다. 게임에 없는 이름은 새 선수로 넣습니다. (game 을 그 자리에서 고칩니다)
 * 띄어쓰기·대소문자만 다른 이름은 같은 사람으로 봅니다.
 */
function idsFor(game: Game, names: string[]): string[] {
  return names.map((name) => {
    const found = game.players.find((p) => personKey(p.name) === personKey(name));
    if (found) return found.id;
    const id = nextId("p", game.players.map((p) => p.id));
    game.players.push({ id, name });
    return id;
  });
}

/** 참가자 이름 묶음을 검사합니다. 묶음마다 size 명이어야 하고, 같은 이름이 두 번 나오면 안 됩니다. */
function readEntries(value: unknown, size: number): string[][] | GameError {
  if (!Array.isArray(value)) return "invalid";
  const entries: string[][] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== size) return "invalid";
    const names = item.map(cleanGameName);
    if (names.some((name) => !name)) return "names";
    for (const name of names) {
      if (seen.has(personKey(name))) return "duplicate";
      seen.add(personKey(name));
    }
    entries.push(names);
  }
  return entries;
}

// ───────────────────────── 경기 ─────────────────────────

/** 경기를 이긴 쪽. 아직 끝나지 않았으면 undefined */
export function matchWinner(match: Pick<GameMatch, "sets" | "walkover">, bestOf: number): Side | undefined {
  if (match.walkover) return match.walkover;
  const [a, b] = match.sets ?? [0, 0];
  const need = gamesToWin(bestOf);
  if (a >= need) return "a";
  if (b >= need) return "b";
  return undefined;
}

export type GameMatchState = "done" | "playing" | "ready";

/** 끝남 · 경기 중(테이블에 올렸거나 세트 점수가 들어감) · 경기 전 */
export function matchState(match: GameMatch, bestOf: number): GameMatchState {
  if (matchWinner(match, bestOf)) return "done";
  const started = match.sets && match.sets[0] + match.sets[1] > 0;
  return match.table || started ? "playing" : "ready";
}

/** 경기 결과를 비교하는 글. 입력하는 동안 다른 사람이 먼저 고쳤는지 확인할 때 씁니다. */
export const gameResultKey = (match: Pick<GameMatch, "sets" | "points" | "walkover">) =>
  JSON.stringify([match.sets ?? null, match.points ?? null, match.walkover ?? null]);

/** 두 쪽에 같은 사람이 있는지 */
const shares = (x: GameMatch, ids: string[]) => [...x.a, ...x.b].some((id) => ids.includes(id));

/** 이 경기를 시작할 수 있는 빈 테이블. 다른 경기가 올라 있거나 선수가 다른 테이블에서 경기 중이면 빠집니다. */
export function freeTables(game: Pick<Game, "tables" | "matches">, match: GameMatch): number[] | "playerBusy" {
  const others = game.matches.filter((m) => m.id !== match.id && m.table);
  if (others.some((m) => shares(m, [...match.a, ...match.b]))) return "playerBusy";
  const taken = new Set(others.map((m) => m.table));
  return Array.from({ length: game.tables }, (_, i) => i + 1).filter(
    (n) => !taken.has(n) && n !== match.table,
  );
}

function placeOnTable(game: Game, match: GameMatch, table: unknown): GameError | null {
  if (typeof table !== "number" || !Number.isInteger(table) || table < 1 || table > game.tables) {
    return "invalid";
  }
  if (match.table === table) return null;
  const free = freeTables(game, match);
  if (free === "playerBusy") return "playerBusy";
  if (!free.includes(table)) return "tableTaken";
  match.table = table;
  return null;
}

/** 입력받은 결과를 경기에 적습니다. 끝난 경기는 테이블에서 내립니다. */
function writeResult(match: GameMatch, result: Pick<GameMatch, "sets" | "points" | "walkover">, bestOf: number, now: string) {
  const wasDone = Boolean(matchWinner(match, bestOf));
  delete match.sets;
  delete match.points;
  delete match.walkover;
  Object.assign(match, result);
  const isDone = Boolean(matchWinner(match, bestOf));
  if (isDone && !wasDone) match.finishedAt = now;
  if (!isDone) delete match.finishedAt;
  if (isDone) delete match.table;
}

const scoreError = (error: string): GameError => (error === "points" ? "points" : "sets");

// ───────────────────────── 순위 ─────────────────────────

export type GameRow = {
  /** 순위표 한 줄의 선수 id. 리그전은 팀(단식은 한 명), 자유 기록은 한 사람입니다. */
  side: string[];
  /** 1부터. 자유 기록에서 기록이 똑같으면 같은 순위입니다. */
  rank: number;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
};

export type GameSummary = {
  rows: GameRow[];
  /** 리그전의 모든 경기가 끝났으면 1·2·3위. 자유 기록은 늘 null 입니다. */
  podium: GameRow[] | null;
  /** 끝난 경기 수 */
  done: number;
  total: number;
};

/** 리그전을 대진표의 종목 하나(조 하나)로 바꿉니다. 순위를 대회와 같은 규칙으로 계산합니다. */
function leagueEvent(game: PublicGame): DrawEvent {
  return {
    id: game.id,
    name: game.title,
    doubles: game.doubles,
    bestOf: game.bestOf,
    groupSize: game.teams.length,
    advance: 1,
    entries: game.teams.map((team) => ({
      id: sideKey(team),
      players: team.map((id) => playerName(game, id)),
    })),
    groups: [game.teams.map(sideKey)],
    status: "live",
    matches: game.matches.map((match) => ({
      id: match.id,
      stage: "group" as const,
      group: 0,
      round: 0,
      a: { entry: sideKey(match.a) },
      b: { entry: sideKey(match.b) },
      ...(match.sets ? { sets: match.sets } : {}),
      ...(match.points ? { points: match.points } : {}),
      ...(match.walkover ? { walkover: match.walkover } : {}),
    })),
  };
}

/** 비율 x1/x2 와 y1/y2 비교 (나눗셈 없이). x 가 크면 양수 */
const compareRatio = (x1: number, x2: number, y1: number, y2: number) => x1 * y2 - y1 * x2;

/**
 * 자유 기록의 순위. 한 사람씩 승수가 많은 순서, 같으면 패가 적은 순서, 그다음 세트 득실 비율입니다.
 * 복식 경기는 두 사람 모두에게 셉니다. 기록이 똑같으면 같은 순위입니다.
 */
function freeRows(game: PublicGame): GameRow[] {
  const rows = new Map(
    game.players.map((p): [string, GameRow] => [
      p.id,
      { side: [p.id], rank: 0, played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0 },
    ]),
  );
  const need = gamesToWin(game.bestOf);
  for (const match of game.matches) {
    const winner = matchWinner(match, game.bestOf);
    if (!winner) continue;
    const [sa, sb] = match.walkover ? (match.walkover === "a" ? [need, 0] : [0, need]) : match.sets!;
    const tally = (ids: string[], won: boolean, mine: number, theirs: number) => {
      for (const id of ids) {
        const row = rows.get(id);
        if (!row) continue;
        row.played += 1;
        if (won) row.wins += 1;
        else row.losses += 1;
        row.setsWon += mine;
        row.setsLost += theirs;
      }
    };
    tally(match.a, winner === "a", sa, sb);
    tally(match.b, winner === "b", sb, sa);
  }
  const order = game.players.map((p) => p.id);
  const compare = (x: GameRow, y: GameRow) =>
    y.wins - x.wins ||
    x.losses - y.losses ||
    -compareRatio(x.setsWon, x.setsLost, y.setsWon, y.setsLost);
  const sorted = [...rows.values()].sort(
    (x, y) => compare(x, y) || order.indexOf(x.side[0]) - order.indexOf(y.side[0]),
  );
  sorted.forEach((row, i) => {
    row.rank = i > 0 && compare(sorted[i - 1], row) === 0 ? sorted[i - 1].rank : i + 1;
  });
  return sorted;
}

export function summarize(game: PublicGame): GameSummary {
  const done = game.matches.filter((m) => matchWinner(m, game.bestOf)).length;
  const total = game.matches.length;
  if (game.format === "free") return { rows: freeRows(game), podium: null, done, total };

  const context = eventContext(leagueEvent(game));
  const teamOf = new Map(game.teams.map((team) => [sideKey(team), team]));
  const rows = context.standings(0).map(
    (row): GameRow => ({
      side: teamOf.get(row.entry) ?? [],
      rank: row.rank,
      played: row.played,
      wins: row.wins,
      losses: row.losses,
      setsWon: row.setsWon,
      setsLost: row.setsLost,
    }),
  );
  const finished = total > 0 && done === total;
  return { rows, podium: finished ? rows.slice(0, 3) : null, done, total };
}

/** 이름(비교용 글 key)으로 찾은 사람의 이 게임 성적. 리그전은 그 사람이 든 팀의 줄입니다. */
export function rowOf(game: PublicGame, summary: GameSummary, key: string): GameRow | null {
  const player = game.players.find((p) => personKey(p.name) === key);
  if (!player) return null;
  return summary.rows.find((row) => row.side.includes(player.id)) ?? null;
}

// ───────────────────────── 새 게임 ─────────────────────────

export type NewGameInput = {
  title: string;
  format: Game["format"];
  doubles: boolean;
  bestOf: number;
  tables: number;
  /** 참가자 이름. 리그전 복식은 두 사람씩 한 팀이고, 그 밖에는 한 사람씩입니다. */
  entries: string[][];
};

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/** 리그전 팀들을 더하고, 새 팀마다 앞의 모든 팀과의 경기를 만듭니다. (game 을 그 자리에서 고칩니다) */
function addTeams(game: Game, entries: string[][]) {
  const before = game.teams.length;
  game.teams.push(...entries.map((names) => idsFor(game, names)));
  const ids = () => game.matches.map((m) => m.id);
  if (before === 0) {
    // 처음 만들 때는 대회 조별 리그와 같은 순서로 놓아, 한 사람이 연달아 치지 않게 합니다.
    for (const [, x, y] of roundRobin(game.teams.length)) {
      game.matches.push({ id: nextId("m", ids()), a: game.teams[x], b: game.teams[y] });
    }
    return;
  }
  for (let k = before; k < game.teams.length; k++) {
    for (let i = 0; i < k; i++) {
      game.matches.push({ id: nextId("m", ids()), a: game.teams[i], b: game.teams[k] });
    }
  }
}

/** 입력 화면에서 받은 내용으로 새 게임을 만듭니다. id 와 만든 사람 열쇠는 저장소가 정합니다. */
export function buildGame(
  input: unknown,
  { id, ownerKeyHash, now }: { id: string; ownerKeyHash: string; now: string },
): { game: Game } | { error: GameError } {
  const value = (input ?? {}) as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.replace(/\s+/g, " ").trim().slice(0, MAX_GAME_TITLE) : "";
  if (!title) return { error: "title" };
  if (value.format !== "league" && value.format !== "free") return { error: "invalid" };
  if (typeof value.doubles !== "boolean") return { error: "invalid" };
  if (typeof value.bestOf !== "number" || !GAME_BEST_OF.includes(value.bestOf)) return { error: "invalid" };
  if (!isInt(value.tables, 0, MAX_GAME_TABLES)) return { error: "invalid" };

  const league = value.format === "league";
  const doubles = league && value.doubles;
  const entries = readEntries(value.entries, doubles ? 2 : 1);
  if (typeof entries === "string") return { error: entries };
  if (league && entries.length < MIN_LEAGUE_ENTRIES) return { error: "tooFew" };
  if ((league && entries.length > MAX_LEAGUE_ENTRIES) || entries.flat().length > MAX_GAME_PLAYERS) {
    return { error: "tooMany" };
  }

  const game: Game = {
    id,
    title,
    format: value.format,
    doubles,
    bestOf: value.bestOf,
    tables: value.tables,
    players: [],
    teams: [],
    matches: [],
    keys: [],
    ownerKeyHash,
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
  if (league) addTeams(game, entries);
  else idsFor(game, entries.flat());
  game.keys = keysOf(game);
  return { game };
}

// ───────────────────────── 기록·관리 ─────────────────────────

export type GameOp =
  // 누구나 (게임이 열려 있는 동안)
  /** 경기 결과 적기·고치기·지우기 (input.kind = "clear") */
  | { op: "score"; match: string; previous: string; input: ScoreInput }
  /** 자유 기록: 새 경기. 이름으로 적고, 게임에 없는 이름은 선수로 더합니다. input 이 없으면 테이블에서 시작만 합니다. */
  | { op: "record"; a: string[]; b: string[]; input: ScoreInput | null; table: number | null }
  /** 자유 기록: 잘못 적은 경기 지우기 */
  | { op: "removeMatch"; match: string; previous: string }
  /** 경기를 테이블에 올리거나(시작) 내립니다(null). */
  | { op: "table"; match: string; table: number | null }
  // 만든 사람·관리자
  | { op: "title"; title: string }
  | { op: "tables"; tables: number }
  /** 참가자 더하기. 리그전은 새 팀과 다른 모든 팀의 경기가 생깁니다. */
  | { op: "addEntries"; entries: string[][] }
  | { op: "renamePlayer"; player: string; name: string }
  /** 선수 빼기. 그 선수(리그전은 그 팀)의 경기도 모두 지웁니다. */
  | { op: "removePlayer"; player: string }
  | { op: "close" }
  | { op: "reopen" };

const OWNER_OPS = new Set(["title", "tables", "addEntries", "renamePlayer", "removePlayer", "close", "reopen"]);

/** 이 조작이 만든 사람(또는 관리자)만 할 수 있는 것인지 */
export const isOwnerOp = (op: GameOp) => OWNER_OPS.has(op?.op);

/**
 * 조작을 적용한 새 게임. 누구나 할 수 있는 조작도 게임이 닫혀 있으면 만든 사람만 합니다.
 * owner 는 만든 사람 열쇠가 맞거나 관리자로 로그인한 경우입니다.
 */
export function applyGameOp(
  game: Game,
  op: GameOp,
  { owner, now, today }: { owner: boolean; now: string; today: string },
): { game: Game } | { error: GameError } {
  const value = (op ?? {}) as Record<string, unknown>;
  if (isOwnerOp(op) && !owner) return { error: "owner" };
  if (!owner && !isGameOpen(game, today)) return { error: "closed" };

  const next: Game = structuredClone(game);
  const match = typeof value.match === "string" ? next.matches.find((m) => m.id === value.match) : undefined;
  const league = next.format === "league";

  switch (op?.op) {
    case "score": {
      if (!match) return { error: "notFound" };
      if (typeof value.previous !== "string") return { error: "invalid" };
      const read = readScore(value.input, next.bestOf);
      if ("error" in read) return { error: scoreError(read.error) };
      if (gameResultKey(match) !== value.previous) {
        // 다른 사람이 먼저 같은 결과를 적었으면 그대로 둡니다.
        if (gameResultKey(read.ok) === gameResultKey(match)) return { game };
        return { error: "conflict" };
      }
      writeResult(match, read.ok, next.bestOf, now);
      break;
    }

    case "record": {
      if (league) return { error: "invalid" };
      const [a, b] = [value.a, value.b].map((side) => (Array.isArray(side) ? side.map(cleanGameName) : []));
      if (a.length < 1 || a.length > 2 || a.length !== b.length) return { error: "invalid" };
      if ([...a, ...b].some((name) => !name)) return { error: "names" };
      if (new Set([...a, ...b].map(personKey)).size !== a.length * 2) return { error: "duplicate" };
      if (value.input == null && value.table == null) return { error: "invalid" };
      if (next.matches.length >= MAX_GAME_MATCHES) return { error: "tooMany" };

      const created: GameMatch = { id: nextId("m", next.matches.map((m) => m.id)), a: idsFor(next, a), b: idsFor(next, b), createdAt: now };
      if (next.players.length > MAX_GAME_PLAYERS) return { error: "tooMany" };
      if (value.input != null) {
        const read = readScore(value.input, next.bestOf);
        if ("error" in read) return { error: scoreError(read.error) };
        if (!read.ok.sets && !read.ok.walkover) return { error: "sets" };
        writeResult(created, read.ok, next.bestOf, now);
      }
      if (value.table != null && !matchWinner(created, next.bestOf)) {
        const placed = placeOnTable(next, created, value.table);
        if (placed) return { error: placed };
      }
      next.matches.push(created);
      break;
    }

    case "removeMatch": {
      if (league) return { error: "invalid" };
      if (!match) return { error: "notFound" };
      if (gameResultKey(match) !== value.previous) return { error: "conflict" };
      next.matches = next.matches.filter((m) => m !== match);
      break;
    }

    case "table": {
      if (!match) return { error: "notFound" };
      if (matchWinner(match, next.bestOf)) return { error: "invalid" };
      if (value.table === null) {
        delete match.table;
      } else {
        const placed = placeOnTable(next, match, value.table);
        if (placed) return { error: placed };
      }
      break;
    }

    case "title": {
      const title = typeof value.title === "string" ? value.title.replace(/\s+/g, " ").trim().slice(0, MAX_GAME_TITLE) : "";
      if (!title) return { error: "title" };
      next.title = title;
      break;
    }

    case "tables": {
      if (!isInt(value.tables, 0, MAX_GAME_TABLES)) return { error: "invalid" };
      next.tables = value.tables;
      for (const m of next.matches) if (m.table && m.table > next.tables) delete m.table;
      break;
    }

    case "addEntries": {
      const entries = readEntries(value.entries, league && next.doubles ? 2 : 1);
      if (typeof entries === "string") return { error: entries };
      if (entries.length === 0) return { error: "names" };
      const known = new Set(next.players.map((p) => personKey(p.name)));
      if (entries.flat().some((name) => known.has(personKey(name)))) return { error: "duplicate" };
      if (
        next.players.length + entries.flat().length > MAX_GAME_PLAYERS ||
        (league && next.teams.length + entries.length > MAX_LEAGUE_ENTRIES)
      ) {
        return { error: "tooMany" };
      }
      if (league) addTeams(next, entries);
      else idsFor(next, entries.flat());
      break;
    }

    case "renamePlayer": {
      const player = next.players.find((p) => p.id === value.player);
      if (!player) return { error: "notFound" };
      const name = cleanGameName(value.name);
      if (!name) return { error: "names" };
      if (next.players.some((p) => p !== player && personKey(p.name) === personKey(name))) {
        return { error: "duplicate" };
      }
      player.name = name;
      break;
    }

    case "removePlayer": {
      const id = typeof value.player === "string" ? value.player : "";
      if (!next.players.some((p) => p.id === id)) return { error: "notFound" };
      // 리그전은 그 선수가 든 팀을 통째로 뺍니다.
      const gone = league ? (next.teams.find((team) => team.includes(id)) ?? [id]) : [id];
      if (league && next.teams.length - 1 < 2) return { error: "tooFew" };
      next.teams = next.teams.filter((team) => !team.some((p) => gone.includes(p)));
      next.matches = next.matches.filter((m) => !shares(m, gone));
      next.players = next.players.filter((p) => !gone.includes(p.id));
      break;
    }

    case "close":
      next.closed = true;
      break;

    case "reopen":
      delete next.closed;
      break;

    default:
      return { error: "invalid" };
  }

  next.keys = keysOf(next);
  return { game: next };
}
