import { addDays } from "@/lib/dates";
import type { Draw, DrawEntry, DrawEvent, DrawMatch, DrawSlot, Tournament } from "@/lib/types";

// 경기 결과로 조 순위·본선 진출자·테이블 배정을 계산합니다.
// 서버(저장할 때)와 브라우저(화면을 그릴 때)가 같은 함수를 씁니다.

export type Side = "a" | "b";

/** 이기려면 몇 게임이 필요한지 (5게임 경기 → 3) */
export const gamesToWin = (bestOf: number) => Math.floor(bestOf / 2) + 1;

/** 경기를 이긴 쪽. 아직 끝나지 않았으면 undefined */
export function winnerOf(match: DrawMatch, bestOf: number): Side | undefined {
  if (match.walkover) return match.walkover;
  const [a, b] = match.sets ?? [0, 0];
  const need = gamesToWin(bestOf);
  if (a >= need) return "a";
  if (b >= need) return "b";
  return undefined;
}

/** 결과를 하나라도 적은 경기 */
export const isStarted = (match: DrawMatch) =>
  Boolean(match.walkover || (match.sets && match.sets[0] + match.sets[1] > 0));

/** 자리에 들어갈 참가자. 아직 앞 경기가 끝나지 않았으면 pending */
export type Resolved = { entry: string } | { bye: true } | { pending: true };

export type MatchState = "bye" | "done" | "playing" | "ready" | "pending";

export type Standing = {
  entry: string;
  /** 1부터 */
  rank: number;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
};

/** 비율 x1/x2 와 y1/y2 비교 (나눗셈 없이). x 가 크면 양수 */
const compareRatio = (x1: number, x2: number, y1: number, y2: number) => x1 * y2 - y1 * x2;

/** 한 종목 안의 계산. 같은 결과를 여러 번 묻기 때문에 한 번 계산한 것은 기억해 둡니다. */
export function eventContext(event: DrawEvent) {
  const matchById = new Map(event.matches.map((m) => [m.id, m]));
  const entryById = new Map(event.entries.map((e) => [e.id, e]));
  const resolved = new Map<string, [Resolved, Resolved]>();
  const standingCache = new Map<number, Standing[]>();

  const groupMatches = (group: number) =>
    event.matches.filter((m) => m.stage === "group" && m.group === group);

  const groupComplete = (group: number) =>
    groupMatches(group).every((m) => winnerOf(m, event.bestOf));

  function standings(group: number): Standing[] {
    const cached = standingCache.get(group);
    if (cached) return cached;

    const members = event.groups[group] ?? [];
    const done = groupMatches(group).filter((m) => winnerOf(m, event.bestOf));
    const blank = (entry: string): Standing => ({
      entry,
      rank: 0,
      played: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
    });

    const tally = (ids: string[]) => {
      const rows = new Map(ids.map((id) => [id, blank(id)]));
      for (const m of done) {
        const a = "entry" in m.a ? m.a.entry : "";
        const b = "entry" in m.b ? m.b.entry : "";
        const ra = rows.get(a);
        const rb = rows.get(b);
        if (!ra || !rb) continue;
        const winner = winnerOf(m, event.bestOf);
        const [sa, sb] = m.walkover
          ? m.walkover === "a"
            ? [gamesToWin(event.bestOf), 0]
            : [0, gamesToWin(event.bestOf)]
          : (m.sets ?? [0, 0]);
        ra.played += 1;
        rb.played += 1;
        if (winner === "a") {
          ra.wins += 1;
          rb.losses += 1;
        } else {
          rb.wins += 1;
          ra.losses += 1;
        }
        ra.setsWon += sa;
        ra.setsLost += sb;
        rb.setsWon += sb;
        rb.setsLost += sa;
        for (const [pa, pb] of m.points ?? []) {
          ra.pointsWon += pa;
          ra.pointsLost += pb;
          rb.pointsWon += pb;
          rb.pointsLost += pa;
        }
      }
      return rows;
    };

    const seedIndex = (id: string) => members.indexOf(id);

    // 승수가 같은 참가자끼리 순위를 가립니다.
    // 두 명이면 둘의 경기 승자, 세 명 이상이면 그들 사이의 경기만으로 승수 → 게임 득실 → 점수 득실을 봅니다.
    // 그래도 같으면 시드(레이팅) 순서입니다.
    function breakTie(ids: string[]): string[] {
      if (ids.length < 2) return ids;
      if (ids.length === 2) {
        const [x, y] = ids;
        const between = done.find(
          (m) =>
            "entry" in m.a &&
            "entry" in m.b &&
            [m.a.entry, m.b.entry].includes(x) &&
            [m.a.entry, m.b.entry].includes(y),
        );
        if (between) {
          const winner = winnerOf(between, event.bestOf);
          const first = winner === "a" ? (between.a as { entry: string }).entry : (between.b as { entry: string }).entry;
          return first === x ? [x, y] : [y, x];
        }
        return [...ids].sort((p, q) => seedIndex(p) - seedIndex(q));
      }
      const rows = tally(ids);
      const compare = (p: string, q: string) => {
        const x = rows.get(p)!;
        const y = rows.get(q)!;
        return (
          y.wins - x.wins ||
          -compareRatio(x.setsWon, x.setsLost, y.setsWon, y.setsLost) ||
          -compareRatio(x.pointsWon, x.pointsLost, y.pointsWon, y.pointsLost)
        );
      };
      const sorted = [...ids].sort((p, q) => compare(p, q) || seedIndex(p) - seedIndex(q));
      const buckets: string[][] = [];
      for (const id of sorted) {
        const last = buckets[buckets.length - 1];
        if (last && compare(last[0], id) === 0) last.push(id);
        else buckets.push([id]);
      }
      if (buckets.length === 1) return sorted;
      return buckets.flatMap((bucket) => breakTie(bucket));
    }

    const rows = tally(members);
    const byWins = [...members].sort(
      (p, q) => rows.get(q)!.wins - rows.get(p)!.wins || seedIndex(p) - seedIndex(q),
    );
    const order: string[] = [];
    for (let i = 0; i < byWins.length; ) {
      let j = i;
      while (j < byWins.length && rows.get(byWins[j])!.wins === rows.get(byWins[i])!.wins) j++;
      order.push(...breakTie(byWins.slice(i, j)));
      i = j;
    }
    const result = order.map((id, index) => ({ ...rows.get(id)!, rank: index + 1 }));
    standingCache.set(group, result);
    return result;
  }

  function resolveSlot(slot: DrawSlot): Resolved {
    if ("entry" in slot) return { entry: slot.entry };
    if ("bye" in slot) return { bye: true };
    if ("group" in slot) {
      if (!groupComplete(slot.group)) return { pending: true };
      const row = standings(slot.group)[slot.rank - 1];
      return row ? { entry: row.entry } : { bye: true };
    }
    const previous = matchById.get(slot.winnerOf);
    if (!previous) return { pending: true };
    const [a, b] = participants(previous);
    if ("bye" in a && "bye" in b) return { bye: true };
    // 부전승 경기는 상대가 정해지는 대로 그 참가자가 올라갑니다.
    if ("bye" in a) return b;
    if ("bye" in b) return a;
    const winner = winnerOf(previous, event.bestOf);
    if (!winner) return { pending: true };
    return winner === "a" ? a : b;
  }

  function participants(match: DrawMatch): [Resolved, Resolved] {
    const cached = resolved.get(match.id);
    if (cached) return cached;
    const pair: [Resolved, Resolved] = [resolveSlot(match.a), resolveSlot(match.b)];
    resolved.set(match.id, pair);
    return pair;
  }

  function stateOf(match: DrawMatch): MatchState {
    const [a, b] = participants(match);
    if ("bye" in a || "bye" in b) return "bye";
    if (winnerOf(match, event.bestOf)) return "done";
    if ("entry" in a && "entry" in b) return match.table || isStarted(match) ? "playing" : "ready";
    return "pending";
  }

  /** 두 참가자 id. 아직 정해지지 않았으면 null */
  function pairOf(match: DrawMatch): [string, string] | null {
    const [a, b] = participants(match);
    return "entry" in a && "entry" in b ? [a.entry, b.entry] : null;
  }

  return {
    event,
    matchById,
    entryById,
    groupMatches,
    groupComplete,
    standings,
    participants,
    pairOf,
    stateOf,
  };
}

export type EventContext = ReturnType<typeof eventContext>;

/** 같은 사람이 두 종목에 나가도 알아볼 수 있게 이름을 비교용으로 바꿉니다. */
const personKey = (name: string) => name.replace(/\s+/g, "").toLowerCase();

const peopleOf = (entries: (DrawEntry | undefined)[]) =>
  entries.flatMap((entry) => entry?.players.map(personKey) ?? []);

/** 테이블을 기다리는 경기 하나 */
export type QueueItem = {
  event: DrawEvent;
  match: DrawMatch;
  /** 두 참가자 가운데 늦게 쉬기 시작한 때. 오래 쉰 쪽이 먼저 칩니다. */
  since: string;
  /** 두 참가자 중 누군가 다른 테이블에서 경기 중이면 true */
  busy: boolean;
};

/**
 * 테이블에서 칠 차례를 기다리는 경기들. 앞에 있을수록 먼저 부릅니다.
 * 두 참가자가 마지막 경기를 마친 때가 이른 경기부터, 같으면 예선 → 본선, 차례 → 종목 → 조 순서입니다.
 */
export function waitingQueue(draw: Draw, contexts = draw.events.map(eventContext)): QueueItem[] {
  const busyPeople = new Set<string>();
  const lastDone = new Map<string, string>();
  const ready: { context: EventContext; match: DrawMatch; order: number[] }[] = [];

  draw.events.forEach((event, eventIndex) => {
    if (event.status !== "live") return;
    const context = contexts[eventIndex];
    event.matches.forEach((match, matchIndex) => {
      const state = context.stateOf(match);
      const pair = context.pairOf(match);
      if (state === "playing" && pair) {
        peopleOf(pair.map((id) => context.entryById.get(id))).forEach((p) => busyPeople.add(p));
      }
      if (state === "done" && pair && match.finishedAt) {
        for (const id of pair) {
          const key = `${event.id}:${id}`;
          if ((lastDone.get(key) ?? "") < match.finishedAt) lastDone.set(key, match.finishedAt);
        }
      }
      if (state === "ready" && !match.hold) {
        ready.push({
          context,
          match,
          order: [
            match.stage === "group" ? 0 : 1,
            match.round,
            eventIndex,
            match.group ?? match.position ?? 0,
            matchIndex,
          ],
        });
      }
    });
  });

  return ready
    .map(({ context, match, order }) => {
      const pair = context.pairOf(match)!;
      const since = [
        context.event.startedAt ?? "",
        ...pair.map((id) => lastDone.get(`${context.event.id}:${id}`) ?? ""),
      ].sort()[2];
      const people = peopleOf(pair.map((id) => context.entryById.get(id)));
      return {
        item: { event: context.event, match, since, busy: people.some((p) => busyPeople.has(p)) },
        order,
      };
    })
    .sort((x, y) => {
      if (x.item.since !== y.item.since) return x.item.since < y.item.since ? -1 : 1;
      for (let i = 0; i < x.order.length; i++) {
        if (x.order[i] !== y.order[i]) return x.order[i] - y.order[i];
      }
      return 0;
    })
    .map(({ item }) => item);
}

/** 깊은 복사. 저장할 대진표를 고치기 전에 원본을 건드리지 않게 합니다. */
export const cloneDraw = (draw: Draw): Draw => structuredClone(draw);

/**
 * 결과가 바뀐 뒤 테이블 배정을 맞춥니다. (draw 를 그 자리에서 고칩니다)
 * - 끝난 경기의 테이블은 비우고, 참가자가 바뀌었거나 아직 정해지지 않은 경기의 배정은 풉니다.
 * - 빈 테이블에는 기다리는 경기를 차례대로 부릅니다. 다른 테이블에서 경기 중인 선수가 있는 경기는 건너뜁니다.
 */
export function settle(draw: Draw, now: string): void {
  let contexts = draw.events.map(eventContext);
  const occupied = new Set<number>();

  draw.events.forEach((event, i) => {
    if (event.status !== "live") return;
    const context = contexts[i];
    for (const match of event.matches) {
      if (!match.table) continue;
      const state = context.stateOf(match);
      if (state === "done") continue;
      const pair = context.pairOf(match);
      const moved =
        !pair ||
        !match.calledFor ||
        match.calledFor[0] !== pair[0] ||
        match.calledFor[1] !== pair[1];
      if (moved || match.table > draw.tables || occupied.has(match.table)) {
        delete match.table;
        delete match.calledFor;
        delete match.calledAt;
      } else {
        occupied.add(match.table);
      }
    }
  });

  // 배정을 바꾸었으니 경기 상태를 다시 계산합니다.
  contexts = draw.events.map(eventContext);
  const queue = waitingQueue(draw, contexts);
  const busyPeople = new Set<string>();
  draw.events.forEach((event, i) => {
    if (event.status !== "live") return;
    for (const match of event.matches) {
      const pair = contexts[i].pairOf(match);
      if (pair && contexts[i].stateOf(match) === "playing") {
        peopleOf(pair.map((id) => contexts[i].entryById.get(id))).forEach((p) => busyPeople.add(p));
      }
    }
  });

  for (let table = 1; table <= draw.tables; table++) {
    if (occupied.has(table)) continue;
    const index = queue.findIndex(({ event, match }) => {
      const context = contexts[draw.events.indexOf(event)];
      const people = peopleOf(context.pairOf(match)!.map((id) => context.entryById.get(id)));
      return !people.some((p) => busyPeople.has(p));
    });
    if (index < 0) break;
    const [{ event, match }] = queue.splice(index, 1);
    const context = contexts[draw.events.indexOf(event)];
    const pair = context.pairOf(match)!;
    match.table = table;
    match.calledFor = pair;
    match.calledAt = now;
    occupied.add(table);
    peopleOf(pair.map((id) => context.entryById.get(id))).forEach((p) => busyPeople.add(p));
  }
}

// ───────────────────────── 점수 입력 ─────────────────────────

/** 점수 입력이 거절된 까닭. 화면에서 언어에 맞는 문구로 바꿉니다. (사전의 draw.errors) */
export type ScoreError =
  | "notFound"
  | "notReady"
  | "closed"
  | "conflict"
  | "points"
  | "sets"
  | "tooManyGames"
  | "locked"
  /** 동시에 입력한 사람이 많아 저장하지 못한 경우 (다시 누르면 됩니다) */
  | "busy";

export type ScoreInput =
  | { kind: "points"; points: [number, number][] }
  | { kind: "sets"; sets: [number, number] }
  | { kind: "walkover"; winner: Side }
  | { kind: "clear" };

/** 경기 결과를 비교하는 글. 입력하는 동안 다른 사람이 먼저 고쳤는지 확인할 때 씁니다. */
export const resultKey = (match: DrawMatch) =>
  JSON.stringify([match.sets ?? null, match.points ?? null, match.walkover ?? null]);

const isScore = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99;

/** 게임 하나의 점수가 탁구 규칙에 맞는지. 11점을 먼저 내거나, 10:10 뒤에는 2점을 앞서야 합니다. */
export function isValidGame([x, y]: [number, number]): boolean {
  if (!isScore(x) || !isScore(y)) return false;
  const high = Math.max(x, y);
  const low = Math.min(x, y);
  return low >= 10 ? high - low === 2 : high === 11;
}

/** 게임별 점수로 이긴 게임 수를 셉니다. 경기가 끝난 뒤에 더 적은 게임이 있으면 null */
export function setsFromPoints(points: [number, number][], bestOf: number): [number, number] | null {
  const need = gamesToWin(bestOf);
  const sets: [number, number] = [0, 0];
  for (const [x, y] of points) {
    if (sets[0] >= need || sets[1] >= need) return null;
    sets[x > y ? 0 : 1] += 1;
  }
  return sets;
}

/** 입력받은 결과를 검사해 경기에 적을 값으로 바꿉니다. */
export function readScore(
  input: unknown,
  bestOf: number,
): { ok: Pick<DrawMatch, "sets" | "points" | "walkover"> } | { error: ScoreError } {
  const value = (input ?? {}) as Record<string, unknown>;
  const need = gamesToWin(bestOf);
  if (value.kind === "clear") return { ok: {} };
  if (value.kind === "walkover") {
    if (value.winner !== "a" && value.winner !== "b") return { error: "sets" };
    return { ok: { walkover: value.winner } };
  }
  if (value.kind === "sets") {
    const sets = value.sets;
    if (!Array.isArray(sets) || sets.length !== 2 || !sets.every(isScore)) return { error: "sets" };
    const [x, y] = sets as [number, number];
    if (x > need || y > need || x + y === 0 || (x === need && y === need)) return { error: "sets" };
    return { ok: { sets: [x, y] } };
  }
  if (value.kind === "points") {
    const points = value.points;
    if (!Array.isArray(points) || points.length === 0 || points.length > bestOf) {
      return { error: "points" };
    }
    const games: [number, number][] = [];
    for (const game of points) {
      if (!Array.isArray(game) || game.length !== 2 || !isValidGame(game as [number, number])) {
        return { error: "points" };
      }
      games.push([game[0], game[1]]);
    }
    const sets = setsFromPoints(games, bestOf);
    if (!sets) return { error: "tooManyGames" };
    return { ok: { sets, points: games } };
  }
  return { error: "sets" };
}

export type ScoreRequest = {
  event: string;
  match: string;
  /** 입력 화면을 열 때 본 결과 (resultKey). 그 사이 바뀌었으면 거절합니다. */
  previous: string;
  input: ScoreInput;
};

/**
 * 점수를 적용한 새 대진표. 다음 경기가 이미 시작되어 상대가 바뀌면 안 되는 경우는 거절합니다.
 * admin 이면 방문자 입력을 막아 둔 때에도 적을 수 있고, 결과를 지울 수도 있습니다.
 */
export function applyScore(
  draw: Draw,
  request: ScoreRequest,
  { admin, now }: { admin: boolean; now: string },
): { draw: Draw } | { error: ScoreError; blockedBy?: string } {
  if (!admin && !draw.scoringOpen) return { error: "closed" };
  const next = cloneDraw(draw);
  const event = next.events.find((e) => e.id === request.event);
  const match = event?.matches.find((m) => m.id === request.match);
  if (!event || !match || event.status !== "live") return { error: "notFound" };

  const before = eventContext(event);
  const state = before.stateOf(match);
  if (state === "pending" || state === "bye") return { error: "notReady" };
  if (request.input?.kind === "clear" && !admin) return { error: "sets" };

  const read = readScore(request.input, event.bestOf);
  if ("error" in read) return read;
  if (resultKey(match) !== request.previous) {
    // 다른 사람이 먼저 같은 결과를 적었으면 그대로 둡니다.
    if (resultKey(read.ok as typeof match) === resultKey(match)) return { draw };
    return { error: "conflict" };
  }

  // 이미 시작한 다른 경기의 참가자가 바뀌는지 미리 확인합니다.
  const startedPairs = new Map(
    event.matches
      .filter((m) => m.id !== match.id && (isStarted(m) || winnerOf(m, event.bestOf)))
      .map((m) => [m.id, JSON.stringify(before.pairOf(m))]),
  );

  const wasDone = Boolean(winnerOf(match, event.bestOf));
  delete match.sets;
  delete match.points;
  delete match.walkover;
  Object.assign(match, read.ok);
  const isDone = Boolean(winnerOf(match, event.bestOf));
  if (isDone && !wasDone) match.finishedAt = now;
  if (!isDone) delete match.finishedAt;

  const after = eventContext(event);
  for (const [id, pair] of startedPairs) {
    if (JSON.stringify(after.pairOf(after.matchById.get(id)!)) !== pair) {
      return { error: "locked", blockedBy: id };
    }
  }

  next.log.unshift({
    at: now,
    event: event.id,
    match: match.id,
    ...(match.sets ? { sets: match.sets } : {}),
    ...(match.walkover ? { walkover: match.walkover } : {}),
    ...(request.input.kind === "clear" ? { cleared: true } : {}),
    ...(admin ? { admin: true } : {}),
  });
  next.log = next.log.slice(0, MAX_LOG);
  settle(next, now);
  return { draw: next };
}

export const MAX_LOG = 500;

/** 방문자가 점수를 입력할 수 있는지. 관리자가 막지 않았다면 대회 다음 날까지 열어 둡니다. */
export function canVisitorsScore(
  draw: Draw,
  tournament: Pick<Tournament, "startDate" | "endDate">,
  today: string,
): boolean {
  return draw.scoringOpen && today <= addDays(tournament.endDate ?? tournament.startDate, 1);
}
