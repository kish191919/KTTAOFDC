import type { Draw, DrawEntry, DrawEvent, DrawPlayer } from "@/lib/types";
import { parseEntries, parsePeople } from "./entries";
import { cloneDraw, eventContext, isStarted, settle, winnerOf } from "./play";
import {
  MAX_PLAYERS,
  personKey,
  placeInSmallest,
  planStart,
  playerByName,
  presence,
  rosterOf,
  teamOf,
  teamRating,
  usesCheckIn,
} from "./roster";
import { buildMatches, makeGroups, seeded } from "./setup";

// 관리자 화면에서 하는 대진표 조작. 관리자 화면은 한국어만 있으므로 안내 문구도 한국어로 돌려줍니다.

export const MAX_TABLES = 40;
export const MAX_EVENTS = 12;
const MAX_EVENT_NAME = 40;
const MAX_NAME = 40;
const MAX_RATING = 9999;

export type EventSettings = {
  name: string;
  nameEn?: string;
  doubles: boolean;
  bestOf: number;
  groupSize: number;
  advance: number;
};

export type DrawOp =
  | { op: "settings"; tables: number; scoringOpen: boolean; checkIn?: boolean }
  | ({ op: "addEvent" } & EventSettings)
  | ({ op: "updateEvent"; event: string } & EventSettings)
  | { op: "removeEvent"; event: string }
  // 선수 명단
  | { op: "addPlayers"; text: string }
  | { op: "updatePlayer"; player: string; name: string; rating: number | null; club: string }
  | { op: "removePlayer"; player: string }
  | { op: "checkIn"; player: string; value: boolean }
  // 종목의 팀
  | { op: "entries"; event: string; text: string }
  | { op: "addTeam"; event: string; players: string[] }
  | { op: "removeTeam"; event: string; entry: string }
  /** 팀의 index 번째 선수를 명단의 다른 선수로 바꿉니다. */
  | { op: "replacePlayer"; event: string; entry: string; index: number; player: string }
  | { op: "autoGroups"; event: string }
  /** group 이 조 수와 같으면 새 조를 만들어 옮깁니다. */
  | { op: "moveEntry"; event: string; entry: string; group: number }
  /** 대진 확정. waiting 은 아직 도착하지 않았지만 조에 남겨 기다릴 팀입니다. 나머지 미도착 팀은 빠집니다. */
  | { op: "start"; event: string; waiting?: string[] }
  | { op: "reset"; event: string }
  /** 경기 중 불참 처리(value = true)와 취소 */
  | { op: "forfeit"; event: string; entry: string; value: boolean }
  /** 숫자면 그 테이블로, "queue" 면 자동 배정 순서로, "hold" 면 자동 배정에서 뺍니다. */
  | { op: "table"; event: string; match: string; table: number | "queue" | "hold" };

export type OpResult = { draw: Draw } | { error: string };

export function newDraw(id: string, now: string): Draw {
  return {
    id,
    tables: 8,
    scoringOpen: true,
    checkIn: true,
    players: [],
    events: [],
    log: [],
    version: 0,
    updatedAt: now,
  };
}

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

const cleanName = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME) : "";

function readSettings(op: Record<string, unknown>): EventSettings | string {
  const name = typeof op.name === "string" ? op.name.trim().slice(0, MAX_EVENT_NAME) : "";
  if (!name) return "종목 이름을 입력해 주세요.";
  const nameEn = typeof op.nameEn === "string" ? op.nameEn.trim().slice(0, MAX_EVENT_NAME) : "";
  if (typeof op.doubles !== "boolean") return "단식·복식을 골라 주세요.";
  if (op.bestOf !== 3 && op.bestOf !== 5 && op.bestOf !== 7) return "경기 방식을 골라 주세요.";
  if (!isInt(op.groupSize, 3, 6)) return "조 인원은 3~6 사이로 골라 주세요.";
  if (!isInt(op.advance, 1, 2)) return "본선 진출 인원은 1명 또는 2명입니다.";
  return {
    name,
    ...(nameEn ? { nameEn } : {}),
    doubles: op.doubles,
    bestOf: op.bestOf,
    groupSize: op.groupSize,
    advance: op.advance,
  };
}

function newEventId(draw: Draw): string {
  for (;;) {
    const id = `ev${Math.random().toString(36).slice(2, 6)}`;
    if (!draw.events.some((e) => e.id === id)) return id;
  }
}

const newEntryId = (event: DrawEvent) =>
  `e${Math.max(0, ...event.entries.map((e) => Number(e.id.slice(1)) || 0)) + 1}`;

/** 조 안의 참가자를 시드(레이팅) 순서로 다시 세웁니다. */
function sortGroup(event: DrawEvent, members: string[]): string[] {
  const order = seeded(event.entries).map((e) => e.id);
  return [...members].sort((x, y) => order.indexOf(x) - order.indexOf(y));
}

/** 명단의 개인 레이팅이 모두 있는 팀은 팀 레이팅을 그 합으로 맞춥니다. (준비 중인 종목만) */
function syncRatings(draw: Draw) {
  const roster = draw.players ?? [];
  for (const event of draw.events) {
    if (event.status !== "setup") continue;
    for (const entry of event.entries) {
      const rating = teamRating(roster, entry.players);
      if (rating !== undefined) entry.rating = rating;
    }
  }
}

function teamFromPlayers(event: DrawEvent, players: DrawPlayer[], roster: DrawPlayer[]): DrawEntry {
  const names = players.map((p) => p.name);
  const rating = teamRating(roster, names);
  const club = players.find((p) => p.club)?.club;
  return {
    id: newEntryId(event),
    players: names,
    ...(rating !== undefined ? { rating } : {}),
    ...(club ? { club } : {}),
  };
}

export function applyAdminOp(draw: Draw, input: unknown, now: string): OpResult {
  const op = (input ?? {}) as Record<string, unknown> & { op?: unknown };
  const next = cloneDraw(draw);
  // 명단은 처음 고칠 때 팀 이름들로 만들어 저장합니다.
  next.players = rosterOf(next);
  const roster = next.players;

  switch (op.op) {
    case "settings": {
      if (!isInt(op.tables, 0, MAX_TABLES)) return { error: `테이블 수는 0~${MAX_TABLES} 사이로 적어 주세요.` };
      if (typeof op.scoringOpen !== "boolean" || (op.checkIn !== undefined && typeof op.checkIn !== "boolean")) {
        return { error: "설정을 읽지 못했습니다." };
      }
      next.tables = op.tables;
      next.scoringOpen = op.scoringOpen;
      if (typeof op.checkIn === "boolean") next.checkIn = op.checkIn;
      settle(next, now);
      return { draw: next };
    }

    case "addEvent": {
      if (next.events.length >= MAX_EVENTS) return { error: `종목은 ${MAX_EVENTS}개까지 만들 수 있습니다.` };
      const settings = readSettings(op);
      if (typeof settings === "string") return { error: settings };
      next.events.push({
        id: newEventId(next),
        ...settings,
        entries: [],
        groups: [],
        status: "setup",
        matches: [],
      });
      return { draw: next };
    }

    case "addPlayers": {
      if (typeof op.text !== "string" || op.text.length > 20_000) return { error: "명단을 읽지 못했습니다." };
      const { people, errors } = parsePeople(op.text);
      if (errors.length > 0) return { error: errors.slice(0, 5).join("\n") };
      if (people.length === 0) return { error: "추가할 선수의 이름을 적어 주세요." };
      let id = Math.max(0, ...roster.map((p) => Number(p.id.slice(1)) || 0)) + 1;
      for (const person of people) {
        const existing = playerByName(roster, person.name);
        if (existing) {
          if (person.rating !== undefined) existing.rating = person.rating;
          if (person.club) existing.club = person.club;
        } else {
          roster.push({ id: `p${id++}`, ...person });
        }
      }
      if (roster.length > MAX_PLAYERS) return { error: `명단에는 ${MAX_PLAYERS}명까지 넣을 수 있습니다.` };
      syncRatings(next);
      return { draw: next };
    }

    case "updatePlayer":
    case "removePlayer":
    case "checkIn": {
      const player = roster.find((p) => p.id === op.player);
      if (!player) return { error: "선수를 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };

      if (op.op === "checkIn") {
        if (typeof op.value !== "boolean") return { error: "체크인 정보를 읽지 못했습니다." };
        if (op.value) player.checkedInAt ??= now;
        else delete player.checkedInAt;
        settle(next, now);
        return { draw: next };
      }

      const inTeams = next.events.filter((event) => teamOf(event, player.name));
      if (op.op === "removePlayer") {
        if (inTeams.length > 0) {
          return { error: `${player.name} 님은 ${inTeams.map((e) => e.name).join(", ")} 팀에 들어 있습니다. 팀에서 먼저 빼 주세요.` };
        }
        next.players = roster.filter((p) => p !== player);
        return { draw: next };
      }

      const name = cleanName(op.name);
      if (!name) return { error: "이름을 입력해 주세요." };
      if (roster.some((p) => p !== player && personKey(p.name) === personKey(name))) {
        return { error: `${name} 님이 명단에 이미 있습니다. 같은 이름이면 뒤에 구분할 글자를 붙여 주세요.` };
      }
      if (op.rating !== null && !isInt(op.rating, 0, MAX_RATING)) return { error: "레이팅은 숫자로 적어 주세요." };
      // 이름을 바꾸면 그 선수가 든 팀의 이름도 함께 바꿉니다.
      for (const event of next.events) {
        for (const entry of event.entries) {
          entry.players = entry.players.map((p) => (personKey(p) === personKey(player.name) ? name : p));
        }
      }
      player.name = name;
      if (op.rating === null) delete player.rating;
      else player.rating = op.rating;
      const club = cleanName(op.club);
      if (club) player.club = club;
      else delete player.club;
      syncRatings(next);
      return { draw: next };
    }
  }

  const event = next.events.find((e) => e.id === op.event);
  if (!event) return { error: "종목을 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };
  const live = event.status === "live";
  const LIVE_LOCKED = "경기를 시작한 종목입니다. 바꾸려면 먼저 '조 편성으로 되돌리기'를 눌러 주세요.";
  const need = event.doubles ? 2 : 1;

  switch (op.op) {
    case "updateEvent": {
      const settings = readSettings(op);
      if (typeof settings === "string") return { error: settings };
      const structural =
        settings.doubles !== event.doubles ||
        settings.bestOf !== event.bestOf ||
        settings.groupSize !== event.groupSize ||
        settings.advance !== event.advance;
      if (live && structural) return { error: LIVE_LOCKED };
      if (settings.doubles !== event.doubles && event.entries.length > 0) {
        return { error: "단식·복식을 바꾸려면 참가 팀을 먼저 비워 주세요." };
      }
      if (settings.groupSize !== event.groupSize) event.groups = [];
      event.name = settings.name;
      if (settings.nameEn) event.nameEn = settings.nameEn;
      else delete event.nameEn;
      Object.assign(event, {
        doubles: settings.doubles,
        bestOf: settings.bestOf,
        groupSize: settings.groupSize,
        advance: settings.advance,
      });
      return { draw: next };
    }

    case "removeEvent": {
      next.events = next.events.filter((e) => e.id !== event.id);
      next.log = next.log.filter((item) => item.event !== event.id);
      settle(next, now);
      return { draw: next };
    }

    case "entries": {
      if (live) return { error: LIVE_LOCKED };
      if (typeof op.text !== "string" || op.text.length > 20_000) return { error: "참가 팀 목록을 읽지 못했습니다." };
      const { entries, ratings, errors } = parseEntries(op.text, event.doubles);
      if (errors.length > 0) return { error: errors.slice(0, 5).join("\n") };
      // 붙여 넣은 이름은 명단에도 한 명씩 올립니다. 팀원마다 적은 레이팅은 개인 레이팅으로 넣습니다.
      let id = Math.max(0, ...roster.map((p) => Number(p.id.slice(1)) || 0)) + 1;
      entries.forEach((entry, i) => {
        entry.players = entry.players.map((name, k) => {
          let player = playerByName(roster, name);
          if (!player) {
            player = { id: `p${id++}`, name, ...(entry.club ? { club: entry.club } : {}) };
            roster.push(player);
          }
          const own = ratings[i]?.[k];
          if (own !== undefined) player.rating = own;
          return player.name;
        });
        if (entry.rating === undefined) {
          const rating = teamRating(roster, entry.players);
          if (rating !== undefined) entry.rating = rating;
        }
      });
      if (roster.length > MAX_PLAYERS) return { error: `명단에는 ${MAX_PLAYERS}명까지 넣을 수 있습니다.` };
      event.entries = entries;
      event.groups = [];
      return { draw: next };
    }

    case "addTeam": {
      if (live) return { error: LIVE_LOCKED };
      if (!Array.isArray(op.players) || op.players.length !== need) {
        return { error: event.doubles ? "두 선수를 골라 주세요." : "선수를 골라 주세요." };
      }
      const players = op.players.map((id) => roster.find((p) => p.id === id));
      if (players.some((p) => !p)) return { error: "선수를 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };
      const picked = players as DrawPlayer[];
      if (new Set(picked.map((p) => p.id)).size !== picked.length) return { error: "같은 선수를 두 번 골랐습니다." };
      const taken = picked.find((p) => teamOf(event, p.name));
      if (taken) return { error: `${taken.name} 님은 이 종목의 다른 팀에 이미 들어 있습니다.` };
      const entry = teamFromPlayers(event, picked, roster);
      event.entries.push(entry);
      if (event.groups.length > 0) {
        event.groups =
          placeInSmallest(event.groups, entry.id, event.entries, event.groupSize) ??
          makeGroups(event.entries, event.groupSize);
      }
      return { draw: next };
    }

    case "removeTeam": {
      if (live) return { error: LIVE_LOCKED };
      if (!event.entries.some((e) => e.id === op.entry)) return { error: "팀을 찾을 수 없습니다." };
      event.entries = event.entries.filter((e) => e.id !== op.entry);
      event.groups = event.groups.map((g) => g.filter((id) => id !== op.entry)).filter((g) => g.length > 0);
      return { draw: next };
    }

    case "replacePlayer": {
      const entry = event.entries.find((e) => e.id === op.entry);
      if (!entry) return { error: "팀을 찾을 수 없습니다." };
      if (entry.absent === "excluded") return { error: "대진에서 빠진 팀입니다." };
      if (!isInt(op.index, 0, entry.players.length - 1)) return { error: "바꿀 선수를 찾을 수 없습니다." };
      const player = roster.find((p) => p.id === op.player);
      if (!player) return { error: "선수를 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };
      const other = teamOf(event, player.name);
      if (other) return { error: `${player.name} 님은 이 종목의 다른 팀에 이미 들어 있습니다.` };
      entry.players = entry.players.map((name, i) => (i === op.index ? player.name : name));
      if (!live) {
        const rating = teamRating(roster, entry.players);
        if (rating !== undefined) entry.rating = rating;
      }
      settle(next, now);
      return { draw: next };
    }

    case "autoGroups": {
      if (live) return { error: LIVE_LOCKED };
      if (event.entries.length < 2) return { error: "참가 팀을 두 팀(명) 이상 넣어 주세요." };
      event.groups = makeGroups(event.entries, event.groupSize);
      return { draw: next };
    }

    case "moveEntry": {
      if (live) return { error: LIVE_LOCKED };
      if (typeof op.entry !== "string" || !event.groups.some((g) => g.includes(op.entry as string))) {
        return { error: "참가 팀을 찾을 수 없습니다." };
      }
      if (!isInt(op.group, 0, event.groups.length)) return { error: "옮길 조를 찾을 수 없습니다." };
      const groups = event.groups.map((g) => g.filter((id) => id !== op.entry));
      if (op.group === groups.length) groups.push([]);
      groups[op.group] = sortGroup(event, [...groups[op.group], op.entry]);
      event.groups = groups.filter((g) => g.length > 0);
      return { draw: next };
    }

    case "start": {
      if (live) return { error: "이미 경기를 시작한 종목입니다." };
      if (op.waiting !== undefined && !Array.isArray(op.waiting)) return { error: "확정 정보를 읽지 못했습니다." };
      const checkIn = usesCheckIn(next);
      const waiting = new Set((op.waiting ?? []).filter((id): id is string => typeof id === "string"));
      const plan = planStart(event, presence(next), waiting);
      if ("error" in plan) return plan;
      if (plan.groups.length > 1 && plan.groups.some((g) => g.length < event.advance)) {
        return { error: "본선 진출 인원보다 적은 조가 있습니다." };
      }
      event.draft = event.groups;
      event.groups = plan.groups.map((g) => sortGroup(event, g));
      for (const entry of event.entries) {
        if (plan.excluded.includes(entry.id)) entry.absent = "excluded";
        else delete entry.absent;
      }
      event.matches = buildMatches(event);
      event.status = "live";
      event.startedAt = now;
      if (checkIn) event.checkIn = true;
      else delete event.checkIn;
      settle(next, now);
      return { draw: next };
    }

    case "reset": {
      if (!live) return { draw: next };
      event.status = "setup";
      event.matches = [];
      if (event.draft) event.groups = event.draft;
      delete event.draft;
      delete event.startedAt;
      delete event.checkIn;
      for (const entry of event.entries) delete entry.absent;
      next.log = next.log.filter((item) => item.event !== event.id);
      settle(next, now);
      return { draw: next };
    }

    case "forfeit": {
      if (!live) return { error: "경기를 시작한 종목이 아닙니다." };
      const entry = event.entries.find((e) => e.id === op.entry);
      if (!entry || entry.absent === "excluded") return { error: "팀을 찾을 수 없습니다." };
      if (op.value === true) {
        entry.absent = "forfeit";
      } else {
        if (entry.absent !== "forfeit") return { draw: next };
        // 불참으로 저절로 적힌 기권승을 지웁니다. 그 결과로 이미 시작한 경기의 상대가 바뀌면 거절합니다.
        const before = eventContext(event);
        const touched = new Set(
          event.matches
            .filter((m) => m.forfeit && before.pairOf(m)?.includes(entry.id))
            .map((m) => m.id),
        );
        const started = new Map(
          event.matches
            .filter((m) => !touched.has(m.id) && (isStarted(m) || winnerOf(m, event.bestOf)))
            .map((m) => [m.id, JSON.stringify(before.pairOf(m))]),
        );
        delete entry.absent;
        for (const match of event.matches) {
          if (!touched.has(match.id)) continue;
          delete match.walkover;
          delete match.forfeit;
          delete match.finishedAt;
        }
        const after = eventContext(event);
        for (const [id, pair] of started) {
          if (JSON.stringify(after.pairOf(after.matchById.get(id)!)) !== pair) {
            return { error: "그 팀의 기권패로 정해진 다음 경기가 이미 시작되어 불참을 취소할 수 없습니다." };
          }
        }
      }
      settle(next, now);
      return { draw: next };
    }

    case "table": {
      if (!live) return { error: "경기를 시작한 종목이 아닙니다." };
      const match = event.matches.find((m) => m.id === op.match);
      if (!match) return { error: "경기를 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };
      const context = eventContext(event);
      const state = context.stateOf(match);
      const value = op.table;
      if (value === "hold" || value === "queue") {
        delete match.table;
        delete match.calledFor;
        delete match.calledAt;
        if (value === "hold") match.hold = true;
        else delete match.hold;
      } else {
        if (!isInt(value, 1, next.tables)) return { error: "테이블 번호가 올바르지 않습니다." };
        if (state !== "ready" && state !== "playing") return { error: "두 참가자가 정해진 경기만 테이블에 배정할 수 있습니다." };
        // 그 테이블에 있던 경기는 다시 차례를 기다립니다.
        for (const other of next.events.flatMap((e) => (e.status === "live" ? e.matches : []))) {
          if (other !== match && other.table === value && !other.finishedAt) {
            delete other.table;
            delete other.calledFor;
            delete other.calledAt;
          }
        }
        match.table = value;
        match.calledFor = context.pairOf(match)!;
        match.calledAt = now;
        delete match.hold;
      }
      settle(next, now);
      return { draw: next };
    }
  }

  return { error: "알 수 없는 요청입니다." };
}
