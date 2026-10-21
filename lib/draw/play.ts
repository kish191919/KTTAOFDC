import { addDays } from "@/lib/dates";
import type { Draw, DrawEntry, DrawEvent, DrawMatch, DrawSlot, Tournament } from "@/lib/types";
import { personKey, presence } from "./roster";

// 경기 결과로 조 순위·본선 진출자·테이블 배정을 계산합니다.
// 서버(저장할 때)와 브라우저(화면을 그릴 때)가 같은 함수를 씁니다.

export type Side = "a" | "b";

/** 이기려면 몇 게임이 필요한지 (5게임 경기 → 3) */
export const gamesToWin = (bestOf: number) => Math.floor(bestOf / 2) + 1;

/** 경기 방식을 정하는 종목 정보 */
export type EventFormat = Pick<DrawEvent, "bestOf" | "knockoutBestOf" | "knockoutFrom" | "matches">;

/** 본선 라운드에 오른 인원. 결승이 2 입니다. */
export function roundSize(event: Pick<DrawEvent, "matches">, round: number): number {
  const first = event.matches.filter((m) => m.stage === "knockout" && m.round === 0).length * 2;
  return first / 2 ** round;
}

/** 이 경기가 몇 게임 경기인지. 본선은 종목에서 정한 라운드부터 knockoutBestOf 로 칩니다. */
export function matchBestOf(event: EventFormat, match: DrawMatch): number {
  if (match.stage !== "knockout" || !event.knockoutBestOf) return event.bestOf;
  if (!event.knockoutFrom || roundSize(event, match.round) <= event.knockoutFrom) return event.knockoutBestOf;
  return event.bestOf;
}

/** 경기를 이긴 쪽. 아직 끝나지 않았으면 undefined */
export function winnerOf(match: DrawMatch, event: EventFormat): Side | undefined {
  if (match.walkover) return match.walkover;
  const [a, b] = match.sets ?? [0, 0];
  const need = gamesToWin(matchBestOf(event, match));
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
  /** 진 경기 중 기권패 (경기 없이 진 것) */
  forfeits: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
};

/**
 * 순위의 첫 기준. ITTF 승점(승 2 · 패 1 · 기권패 0)은 치른 경기 수가 같으면 "승수 − 기권패 수" 순서와 같습니다.
 * 조 경기 도중에는 경기 수가 달라 승점으로 비교하면 진 경기를 더 치른 쪽이 앞설 수 있어 이 값을 씁니다.
 */
const rankScore = (row: Standing) => row.wins - row.forfeits;

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
    groupMatches(group).every((m) => winnerOf(m, event));

  function standings(group: number): Standing[] {
    const cached = standingCache.get(group);
    if (cached) return cached;

    const members = event.groups[group] ?? [];
    const done = groupMatches(group).filter((m) => winnerOf(m, event));
    const blank = (entry: string): Standing => ({
      entry,
      rank: 0,
      played: 0,
      wins: 0,
      losses: 0,
      forfeits: 0,
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
        const winner = winnerOf(m, event);
        const [sa, sb] = m.walkover
          ? m.walkover === "a"
            ? [gamesToWin(matchBestOf(event, m)), 0]
            : [0, gamesToWin(matchBestOf(event, m))]
          : (m.sets ?? [0, 0]);
        ra.played += 1;
        rb.played += 1;
        if (winner === "a") {
          ra.wins += 1;
          rb.losses += 1;
          if (m.walkover) rb.forfeits += 1;
        } else {
          rb.wins += 1;
          ra.losses += 1;
          if (m.walkover) ra.forfeits += 1;
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

    // 승점이 같은 참가자끼리 순위를 가립니다. (ITTF 방식)
    // 두 명이면 둘의 경기 승자, 세 명 이상이면 그들 사이의 경기만으로 승점 → 게임 득실 → 점수 득실을 봅니다.
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
          const winner = winnerOf(between, event);
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
          rankScore(y) - rankScore(x) ||
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
    const score = (id: string) => rankScore(rows.get(id)!);
    const byScore = [...members].sort((p, q) => score(q) - score(p) || seedIndex(p) - seedIndex(q));
    const order: string[] = [];
    for (let i = 0; i < byScore.length; ) {
      let j = i;
      while (j < byScore.length && score(byScore[j]) === score(byScore[i])) j++;
      order.push(...breakTie(byScore.slice(i, j)));
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
    const winner = winnerOf(previous, event);
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
    if (winnerOf(match, event)) return "done";
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

/** 팀원의 이름(비교용). 같은 사람이 두 종목에 나가도 알아볼 수 있습니다. */
const peopleOf = (entries: (DrawEntry | undefined)[]) =>
  entries.flatMap((entry) => entry?.players.map(personKey) ?? []);

/** 지금 칠 수 있는 경기 하나 (두 참가자가 정해졌고 아직 시작하지 않은 경기) */
export type QueueItem = {
  event: DrawEvent;
  match: DrawMatch;
  /** 두 참가자 가운데 늦게 쉬기 시작한 때. 오래 쉰 쪽이 먼저 칩니다. */
  since: string;
  /** 두 참가자 중 누군가 다른 테이블에서 경기 중이면 true */
  busy: boolean;
  /** 체크인을 거쳐 확정한 종목에서 아직 도착하지 않은 팀이 있으면 true. 도착할 때까지 시작하지 않습니다. */
  absent: boolean;
};

/**
 * 지금 칠 수 있는 경기들. 오래 기다린 경기가 앞에 옵니다.
 * 두 참가자가 마지막 경기를 마친 때가 이른 경기부터, 같으면 예선 → 본선, 차례 → 종목 → 조 순서입니다.
 */
export function waitingQueue(draw: Draw, contexts = draw.events.map(eventContext)): QueueItem[] {
  const isPresent = presence(draw);
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
      if (state === "ready") {
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
      const entries = pair.map((id) => context.entryById.get(id));
      const people = peopleOf(entries);
      const absent =
        Boolean(context.event.checkIn) && entries.some((entry) => !entry || !isPresent(entry));
      return {
        item: {
          event: context.event,
          match,
          since,
          busy: people.some((p) => busyPeople.has(p)),
          absent,
        },
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
 * 결과가 바뀐 뒤 테이블을 맞춥니다. (draw 를 그 자리에서 고칩니다)
 * - 조 테이블이 비어 있는 종목은 채웁니다.
 * - 끝난 경기는 테이블을 차지하지 않고, 참가자가 바뀌었거나 아직 정해지지 않은 경기는 테이블에서 내립니다.
 * - 빈 테이블에 다음 경기를 저절로 올리지는 않습니다. 칠 경기는 테이블에서 시작을 누른 사람이 정합니다.
 */
export function settle(draw: Draw, now: string): void {
  applyForfeits(draw, now);
  fillGroupTables(draw);
  const contexts = draw.events.map(eventContext);
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
        leaveTable(match);
      } else {
        occupied.add(match.table);
      }
    }
  });
}

/**
 * 불참 처리한 팀(absent: "forfeit")의 남은 경기를 상대의 기권승으로 적습니다.
 * 본선에서는 기권승으로 다음 경기가 정해지므로, 더 바뀌지 않을 때까지 되풀이합니다.
 */
function applyForfeits(draw: Draw, now: string): void {
  for (const event of draw.events) {
    if (event.status !== "live") continue;
    if (!event.entries.some((entry) => entry.absent === "forfeit")) continue;
    for (let pass = 0; pass < 12; pass++) {
      const context = eventContext(event);
      let changed = false;
      for (const match of event.matches) {
        if (context.stateOf(match) === "done") continue;
        const pair = context.pairOf(match);
        if (!pair) continue;
        const [a, b] = pair.map((id) => context.entryById.get(id)?.absent === "forfeit");
        if (!a && !b) continue;
        match.walkover = a ? "b" : "a";
        match.forfeit = true;
        match.finishedAt = now;
        delete match.sets;
        delete match.points;
        changed = true;
      }
      if (!changed) break;
    }
  }
}

const leaveTable = (match: DrawMatch) => {
  delete match.table;
  delete match.calledFor;
  delete match.calledAt;
};

// ───────────────────────── 테이블 ─────────────────────────
// 조마다 테이블을 하나씩 정하고(groupTables), 조 안의 경기는 그 테이블에서 아무 순서로나 칩니다.
// 본선 경기와 남는 테이블은 빈 테이블에서 칠 경기를 골라 시작합니다.

const isTable = (draw: Pick<Draw, "tables">, n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= draw.tables;

/** 조 테이블을 새로 정해야 하는 종목: 경기 중인데 조 테이블이 없거나, 조 수와 맞지 않거나, 없는 테이블을 가리킵니다. */
const needsGroupTables = (draw: Draw, event: DrawEvent) =>
  event.status === "live" &&
  (event.groupTables?.length !== event.groups.length ||
    event.groupTables.some((n) => !isTable(draw, n)));

/**
 * 조 테이블이 없거나 잘못된 조에 테이블을 정합니다. (draw 를 그 자리에서 고칩니다)
 * 경기가 남은 다른 조가 가장 적게 쓰는 테이블을 고르고, 같으면 번호가 낮은 테이블입니다.
 * 테이블이 조보다 적으면 두 조가 한 테이블을 나눠 씁니다.
 * 조 테이블이 아예 없던 종목(빈 테이블에 다음 경기를 저절로 올리던 때 확정한 종목)은
 * 점수 없이 테이블에 올라 있던 경기를 내립니다. 그때는 아무도 시작을 누르지 않았기 때문입니다.
 */
export function fillGroupTables(draw: Draw): void {
  if (draw.tables <= 0) return;
  const live = draw.events.filter((event) => event.status === "live");
  if (!live.some((event) => needsGroupTables(draw, event))) return;

  const contexts = new Map(live.map((event) => [event, eventContext(event)]));
  const load = Array.from({ length: draw.tables + 1 }, () => 0);
  for (const event of live) {
    if (needsGroupTables(draw, event)) continue;
    event.groupTables!.forEach((n, group) => {
      if (!contexts.get(event)!.groupComplete(group)) load[n] += 1;
    });
  }

  for (const event of live) {
    if (!needsGroupTables(draw, event)) continue;
    const before = event.groupTables;
    event.groupTables = event.groups.map((_, group) => {
      const kept = before?.[group];
      let table = kept;
      if (!isTable(draw, table)) {
        table = 1;
        for (let n = 2; n <= draw.tables; n++) if (load[n] < load[table]) table = n;
      }
      if (!contexts.get(event)!.groupComplete(group)) load[table] += 1;
      return table;
    });
    if (!before) {
      for (const match of event.matches) if (match.table && !isStarted(match)) leaveTable(match);
    }
  }
}

/** 화면에 그릴 대진표. 조 테이블을 채워야 하면 사본에 채웁니다. (저장할 때 settle 이 똑같이 채웁니다) */
export function withGroupTables(draw: Draw): Draw {
  if (draw.tables <= 0 || !draw.events.some((event) => needsGroupTables(draw, event))) return draw;
  const copy = cloneDraw(draw);
  fillGroupTables(copy);
  return copy;
}

/** 경기 중인 경기 하나 */
export type Placed = { event: DrawEvent; match: DrawMatch };

export type TableSlot = {
  table: number;
  /** 이 테이블을 쓰는 조 가운데 아직 경기가 남은 조 */
  groups: { event: DrawEvent; group: number }[];
  /** 이 테이블에서 경기 중인 경기. 시작을 누른 경기와, 점수가 들어갔지만 테이블을 모르는 이 조의 경기입니다. */
  playing: Placed[];
};

/** 테이블 현황. 화면과 서버(테이블에 올릴 때의 검사)가 함께 씁니다. */
export type TableBoard = {
  tables: TableSlot[];
  /** 경기 중이지만 어느 테이블인지 모르는 경기 */
  elsewhere: Placed[];
  /** 지금 칠 수 있는 경기 (오래 기다린 순서) */
  queue: QueueItem[];
  /** 경기 중인 경기가 있는 테이블 */
  tableOf: (match: DrawMatch) => number | undefined;
  /** 예선 조의 테이블 */
  groupTable: (event: DrawEvent, group: number) => number | undefined;
};

export function tableBoard(draw: Draw, contexts = draw.events.map(eventContext)): TableBoard {
  const tables: TableSlot[] = Array.from({ length: Math.max(0, draw.tables) }, (_, i) => ({
    table: i + 1,
    groups: [],
    playing: [],
  }));
  const groupTable = (event: DrawEvent, group: number) => {
    const n = event.groupTables?.[group];
    return isTable(draw, n) ? n : undefined;
  };
  const where = new Map<DrawMatch, number>();
  const unplaced: { placed: Placed; home?: number }[] = [];

  draw.events.forEach((event, i) => {
    if (event.status !== "live") return;
    const context = contexts[i];
    event.groups.forEach((_, group) => {
      const n = groupTable(event, group);
      if (n && !context.groupComplete(group)) tables[n - 1].groups.push({ event, group });
    });
    for (const match of event.matches) {
      if (context.stateOf(match) !== "playing") continue;
      const placed = { event, match };
      if (isTable(draw, match.table)) {
        tables[match.table - 1].playing.push(placed);
        where.set(match, match.table);
      } else {
        unplaced.push({ placed, home: match.stage === "group" ? groupTable(event, match.group ?? 0) : undefined });
      }
    }
  });

  // 점수만 들어가고 테이블을 모르는 예선 경기는 그 조의 테이블에 보여 줍니다.
  // 그 테이블에서 시작을 누른 다른 경기가 있으면 어디서 치는지 모르는 경기로 둡니다.
  const elsewhere: Placed[] = [];
  for (const { placed, home } of unplaced) {
    const slot = home ? tables[home - 1] : undefined;
    if (slot && !slot.playing.some((p) => p.match.table)) {
      slot.playing.push(placed);
      where.set(placed.match, slot.table);
    } else {
      elsewhere.push(placed);
    }
  }

  return {
    tables,
    elsewhere,
    queue: waitingQueue(draw, contexts),
    tableOf: (match) => where.get(match),
    groupTable,
  };
}

/** 화면이 본 테이블의 경기를 나타내는 글. 테이블에 올리는 동안 다른 사람이 먼저 바꿨는지 확인할 때 씁니다. */
export const occupantKey = (slot: TableSlot | undefined) =>
  slot?.playing[0] ? `${slot.playing[0].event.id}:${slot.playing[0].match.id}` : "";

export type TableChoices = {
  /** 예선 경기가 치는 조 테이블. replaces 는 시작만 누르고 점수가 없어 대기로 돌아갈 경기입니다. */
  home?: { table: number; replaces?: Placed };
  /** 이 경기를 시작할 수 있는 다른 빈 테이블 */
  free: number[];
  /** 선수가 다른 경기 중이라 빈 테이블에서는 시작할 수 없음 (조 테이블에서 대기로 돌릴 경기는 치지 않습니다) */
  busy?: true;
  /** 어느 테이블에서도 시작할 수 없는 까닭 */
  blocked?: "playerBusy" | "notArrived";
};

/**
 * 이 경기를 어느 테이블에서 시작할 수 있는지. 점수 입력 창의 버튼과 서버의 검사가 같은 함수를 씁니다.
 * - 조 테이블: 점수가 들어간 경기가 있으면 쓸 수 없고, 시작만 누른 경기는 대기로 돌리고 올릴 수 있습니다.
 * - 빈 테이블: 경기가 남은 조가 없고 아무 경기도 하지 않는 테이블입니다.
 * - 선수가 다른 경기 중이거나 도착 확인 전인 팀이 있으면 시작할 수 없습니다.
 * 관리자는 제한 없이 모든 테이블에 올릴 수 있습니다.
 */
export function tableChoices(
  draw: Draw,
  board: TableBoard,
  event: DrawEvent,
  match: DrawMatch,
  admin: boolean,
  contexts = draw.events.map(eventContext),
): TableChoices {
  const contextOf = (e: DrawEvent) => contexts[draw.events.indexOf(e)];
  const context = contextOf(event);
  const state = context.stateOf(match);
  const pair = context.pairOf(match);
  if (draw.tables <= 0 || !pair || (state !== "ready" && state !== "playing")) return { free: [] };
  if (admin) {
    return { free: board.tables.map((slot) => slot.table).filter((n) => n !== match.table) };
  }

  const entries = pair.map((id) => context.entryById.get(id));
  const isPresent = presence(draw);
  if (event.checkIn && entries.some((entry) => !entry || !isPresent(entry))) {
    return { free: [], blocked: "notArrived" };
  }

  const mine = new Set(peopleOf(entries));
  const others = [...board.tables.flatMap((slot) => slot.playing), ...board.elsewhere].filter(
    (p) => p.match !== match,
  );
  const clashes = (p: Placed) => {
    const c = contextOf(p.event);
    return peopleOf((c.pairOf(p.match) ?? []).map((id) => c.entryById.get(id))).some((x) => mine.has(x));
  };

  let home: TableChoices["home"];
  const homeTable = match.stage === "group" ? board.groupTable(event, match.group ?? 0) : undefined;
  if (homeTable && homeTable !== match.table) {
    const there = board.tables[homeTable - 1].playing.filter((p) => p.match !== match);
    if (there.every((p) => !isStarted(p.match))) {
      const replaced = new Set(there.map((p) => p.match));
      if (!others.some((p) => !replaced.has(p.match) && clashes(p))) {
        home = { table: homeTable, ...(there[0] ? { replaces: there[0] } : {}) };
      }
    }
  }

  const busy = others.some(clashes);
  const free = busy
    ? []
    : board.tables
        .filter(
          (slot) =>
            slot.table !== homeTable &&
            slot.table !== match.table &&
            slot.groups.length === 0 &&
            slot.playing.length === 0,
        )
        .map((slot) => slot.table);
  return {
    ...(home ? { home } : {}),
    free,
    ...(busy ? { busy: true as const } : {}),
    ...(busy && !home ? { blocked: "playerBusy" as const } : {}),
  };
}

export type TableRequest = {
  event: string;
  match: string;
  /** 올릴 테이블. null 이면 테이블에서 내립니다. */
  table: number | null;
  /** 화면에서 본 그 테이블의 경기 (occupantKey). 그 사이 바뀌었으면 거절합니다. */
  occupant: string;
};

/**
 * 경기를 테이블에 올리거나(시작) 내린 새 대진표. 누구나 씁니다.
 * 그 테이블에 시작만 누른 다른 경기가 있으면 그 경기는 대기로 돌아갑니다.
 */
export function applyTable(
  draw: Draw,
  request: TableRequest,
  { admin, now }: { admin: boolean; now: string },
): { draw: Draw } | { error: ScoreError } {
  if (!admin && !draw.scoringOpen) return { error: "closed" };
  const next = cloneDraw(draw);
  fillGroupTables(next);
  const event = next.events.find((e) => e.id === request.event);
  const match = event?.matches.find((m) => m.id === request.match);
  if (!event || !match || event.status !== "live") return { error: "notFound" };

  const contexts = next.events.map(eventContext);
  const context = contexts[next.events.indexOf(event)];
  const state = context.stateOf(match);
  if (state !== "ready" && state !== "playing") return { error: "notReady" };

  if (request.table === null) {
    leaveTable(match);
  } else {
    const table = request.table;
    if (!isTable(next, table)) return { error: "notFound" };
    const board = tableBoard(next, contexts);
    const slot = board.tables[table - 1];
    if (match.table !== table && occupantKey(slot) !== request.occupant) return { error: "tableTaken" };
    if (!admin) {
      const choices = tableChoices(next, board, event, match, false, contexts);
      if (choices.home?.table !== table && !choices.free.includes(table)) {
        return { error: choices.blocked ?? (choices.busy ? "playerBusy" : "tableInUse") };
      }
    }
    // 그 테이블에 올라 있던 다른 경기는 내립니다. (점수가 들어간 경기는 관리자만 이렇게 내릴 수 있습니다)
    for (const p of slot.playing) if (p.match !== match && p.match.table === table) leaveTable(p.match);
    match.table = table;
    match.calledFor = context.pairOf(match)!;
    match.calledAt = now;
  }
  settle(next, now);
  return { draw: next };
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
  | "locked"
  /** 동시에 입력한 사람이 많아 저장하지 못한 경우 (다시 누르면 됩니다) */
  | "busy"
  // 테이블에 올릴 때 (applyTable)
  /** 그 사이 다른 사람이 그 테이블에 경기를 올렸습니다. */
  | "tableTaken"
  /** 점수가 들어간 경기나 다른 조가 쓰는 테이블입니다. */
  | "tableInUse"
  | "playerBusy"
  | "notArrived";

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

/**
 * 게임별 점수로 이긴 게임 수를 셉니다. 승부가 난 뒤에 마저 친 게임도 셉니다. (3세트 2선승을 끝까지 쳐서 3:0)
 * bestOf 게임을 넘지 않으면 먼저 이길 게임 수를 채운 쪽이 끝까지 앞서므로 승자는 바뀌지 않습니다.
 */
export function setsFromPoints(points: [number, number][]): [number, number] {
  const sets: [number, number] = [0, 0];
  for (const [x, y] of points) sets[x > y ? 0 : 1] += 1;
  return sets;
}

/** 입력받은 결과를 검사해 경기에 적을 값으로 바꿉니다. */
export function readScore(
  input: unknown,
  bestOf: number,
): { ok: Pick<DrawMatch, "sets" | "points" | "walkover"> } | { error: ScoreError } {
  const value = (input ?? {}) as Record<string, unknown>;
  if (value.kind === "clear") return { ok: {} };
  if (value.kind === "walkover") {
    if (value.winner !== "a" && value.winner !== "b") return { error: "sets" };
    return { ok: { walkover: value.winner } };
  }
  if (value.kind === "sets") {
    const sets = value.sets;
    if (!Array.isArray(sets) || sets.length !== 2 || !sets.every(isScore)) return { error: "sets" };
    const [x, y] = sets as [number, number];
    // 승부가 난 뒤에 마저 친 게임까지 합쳐 bestOf 게임까지 적습니다. (그러면 두 쪽이 다 이길 게임 수를 채울 수 없습니다)
    if (x + y === 0 || x + y > bestOf) return { error: "sets" };
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
    return { ok: { sets: setsFromPoints(games), points: games } };
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

  const read = readScore(request.input, matchBestOf(event, match));
  if ("error" in read) return read;
  if (resultKey(match) !== request.previous) {
    // 다른 사람이 먼저 같은 결과를 적었으면 그대로 둡니다.
    if (resultKey(read.ok as typeof match) === resultKey(match)) return { draw };
    return { error: "conflict" };
  }

  // 이미 시작한 다른 경기의 참가자가 바뀌는지 미리 확인합니다.
  const startedPairs = new Map(
    event.matches
      .filter((m) => m.id !== match.id && (isStarted(m) || winnerOf(m, event)))
      .map((m) => [m.id, JSON.stringify(before.pairOf(m))]),
  );

  const wasDone = Boolean(winnerOf(match, event));
  delete match.sets;
  delete match.points;
  delete match.walkover;
  Object.assign(match, read.ok);
  const isDone = Boolean(winnerOf(match, event));
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
