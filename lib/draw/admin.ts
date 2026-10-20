import type { Draw, DrawEvent } from "@/lib/types";
import { parseEntries } from "./entries";
import { cloneDraw, eventContext, settle } from "./play";
import { buildMatches, makeGroups, seeded } from "./setup";

// 관리자 화면에서 하는 대진표 조작. 관리자 화면은 한국어만 있으므로 안내 문구도 한국어로 돌려줍니다.

export const MAX_TABLES = 40;
export const MAX_EVENTS = 12;
const MAX_EVENT_NAME = 40;

export type EventSettings = {
  name: string;
  nameEn?: string;
  doubles: boolean;
  bestOf: number;
  groupSize: number;
  advance: number;
};

export type DrawOp =
  | { op: "settings"; tables: number; scoringOpen: boolean }
  | ({ op: "addEvent" } & EventSettings)
  | ({ op: "updateEvent"; event: string } & EventSettings)
  | { op: "removeEvent"; event: string }
  | { op: "entries"; event: string; text: string }
  | { op: "autoGroups"; event: string }
  /** group 이 조 수와 같으면 새 조를 만들어 옮깁니다. */
  | { op: "moveEntry"; event: string; entry: string; group: number }
  | { op: "start"; event: string }
  | { op: "reset"; event: string }
  /** 숫자면 그 테이블로, "queue" 면 자동 배정 순서로, "hold" 면 자동 배정에서 뺍니다. */
  | { op: "table"; event: string; match: string; table: number | "queue" | "hold" };

export type OpResult = { draw: Draw } | { error: string };

export function newDraw(id: string, now: string): Draw {
  return { id, tables: 8, scoringOpen: true, events: [], log: [], version: 0, updatedAt: now };
}

const isInt = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

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

/** 조 안의 참가자를 시드(레이팅) 순서로 다시 세웁니다. */
function sortGroup(event: DrawEvent, members: string[]): string[] {
  const order = seeded(event.entries).map((e) => e.id);
  return [...members].sort((x, y) => order.indexOf(x) - order.indexOf(y));
}

export function applyAdminOp(draw: Draw, input: unknown, now: string): OpResult {
  const op = (input ?? {}) as Record<string, unknown> & { op?: unknown };
  const next = cloneDraw(draw);

  if (op.op === "settings") {
    if (!isInt(op.tables, 0, MAX_TABLES)) return { error: `테이블 수는 0~${MAX_TABLES} 사이로 적어 주세요.` };
    if (typeof op.scoringOpen !== "boolean") return { error: "점수 입력 설정을 읽지 못했습니다." };
    next.tables = op.tables;
    next.scoringOpen = op.scoringOpen;
    settle(next, now);
    return { draw: next };
  }

  if (op.op === "addEvent") {
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

  const event = next.events.find((e) => e.id === op.event);
  if (!event) return { error: "종목을 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };
  const live = event.status === "live";
  const LIVE_LOCKED = "경기를 시작한 종목입니다. 바꾸려면 먼저 '조 편성으로 되돌리기'를 눌러 주세요.";

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
        return { error: "단식·복식을 바꾸려면 참가자 목록을 먼저 비워 주세요." };
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
      if (typeof op.text !== "string" || op.text.length > 20_000) return { error: "참가자 목록을 읽지 못했습니다." };
      const { entries, errors } = parseEntries(op.text, event.doubles);
      if (errors.length > 0) return { error: errors.slice(0, 5).join("\n") };
      event.entries = entries;
      event.groups = [];
      return { draw: next };
    }

    case "autoGroups": {
      if (live) return { error: LIVE_LOCKED };
      if (event.entries.length < 2) return { error: "참가자를 두 명(팀) 이상 넣어 주세요." };
      event.groups = makeGroups(event.entries, event.groupSize);
      return { draw: next };
    }

    case "moveEntry": {
      if (live) return { error: LIVE_LOCKED };
      if (typeof op.entry !== "string" || !event.groups.some((g) => g.includes(op.entry as string))) {
        return { error: "참가자를 찾을 수 없습니다." };
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
      const placed = event.groups.flat();
      if (event.groups.length === 0) return { error: "먼저 조 편성을 만들어 주세요." };
      if (
        placed.length !== event.entries.length ||
        new Set(placed).size !== placed.length ||
        !event.entries.every((e) => placed.includes(e.id))
      ) {
        return { error: "조 편성이 참가자 목록과 맞지 않습니다. 조 편성을 다시 만들어 주세요." };
      }
      if (event.groups.some((g) => g.length < 2)) return { error: "한 명(팀)뿐인 조가 있습니다. 다른 조로 옮겨 주세요." };
      if (event.groups.length > 1 && event.groups.some((g) => g.length < event.advance)) {
        return { error: "본선 진출 인원보다 적은 조가 있습니다." };
      }
      event.groups = event.groups.map((g) => sortGroup(event, g));
      event.matches = buildMatches(event);
      event.status = "live";
      event.startedAt = now;
      settle(next, now);
      return { draw: next };
    }

    case "reset": {
      if (!live) return { draw: next };
      event.status = "setup";
      event.matches = [];
      delete event.startedAt;
      next.log = next.log.filter((item) => item.event !== event.id);
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
