import type { Draw, DrawEntry, DrawEvent, DrawMatch, DrawSlot, PrintedSheet, SheetContent } from "@/lib/types";
import { eventContext, groupTablesOf, matchBestOf, winnerOf, withGroupTables, type EventContext } from "./play";
import { isByeMatch } from "./view";

// 인쇄한 경기 기록지와 지금 대진표가 맞는지 확인합니다.
// 기록지를 뽑을 때 종이에 찍힌 내용(팀 이름 · 테이블 번호 · 세트 칸 수)을 종목에 적어 두고(DrawEvent.printed),
// 그 뒤 테이블을 옮기거나 선수를 바꾸거나 대진을 다시 확정하면 어느 종이를 다시 뽑아야 하는지 알려 줍니다.
// 인쇄 페이지(무엇을 찍을지), 관리자 화면(다시 뽑을 종이), 서버(뽑은 기록 남기기)가 같은 함수를 씁니다.

/** 조 기록지의 열쇠 "g0" (A조). 본선 기록지는 경기 id 를 그대로 씁니다. */
export const groupSheetKey = (group: number) => `g${group}`;

const groupOfKey = (key: string) => {
  const found = /^g(\d+)$/.exec(key);
  return found ? Number(found[1]) : null;
};

/** 종이에 찍히는 팀 이름 "김수미 / 이도임" (components/draw/ScoreSheets.tsx 의 TeamNames 와 같은 순서) */
const teamText = (entry: DrawEntry | undefined) => (entry ? entry.players.join(" / ") : "?");

/** 정해지지 않은 본선 자리를 나타내는 글. 화면에 보여 주지 않고, 자리가 그대로인지 비교하는 데만 씁니다. */
const slotKey = (slot: DrawSlot) => `#${JSON.stringify(slot)}`;
const isSlotKey = (side: string) => side.startsWith("#");

/** 본선 기록지로 뽑는 경기 (부전승 경기는 뽑지 않습니다) */
const isKnockoutSheet = (match: DrawMatch) => match.stage === "knockout" && !isByeMatch(match);

/** 조 기록지에 찍히는 내용. 조 테이블을 채운 대진표(withGroupTables)를 받습니다. */
function groupContent(draw: Draw, event: DrawEvent, group: number): SheetContent {
  const entries = new Map(event.entries.map((e) => [e.id, e]));
  return {
    sides: (event.groups[group] ?? []).map((id) => teamText(entries.get(id))),
    tables: groupTablesOf(draw, event, group),
    bestOf: event.bestOf,
  };
}

/** 본선 기록지 한 칸에 찍히는 내용 */
function knockoutContent(draw: Draw, event: DrawEvent, context: EventContext, match: DrawMatch): SheetContent {
  const table = match.table;
  return {
    sides: context
      .participants(match)
      .map((resolved, i) =>
        "entry" in resolved ? teamText(context.entryById.get(resolved.entry)) : slotKey(i === 0 ? match.a : match.b),
      ),
    tables: typeof table === "number" && table >= 1 && table <= draw.tables ? [table] : [],
    bestOf: matchBestOf(event, match),
  };
}

/** 뽑을 수 있는 기록지 한 장 (조 하나 또는 본선 경기 하나) */
export type SheetRef = {
  key: string;
  stage: "group" | "knockout";
  /** 조 기록지의 조 (0 = A조) */
  group?: number;
  /** 본선 기록지의 경기 */
  match?: DrawMatch;
  content: SheetContent;
};

/** 대진을 확정한 종목의 기록지들. 조 기록지는 조마다, 본선 기록지는 부전승을 뺀 경기마다 하나입니다. */
export function sheetsOf(draw: Draw, eventId: string): SheetRef[] {
  const shown = withGroupTables(draw);
  const event = shown.events.find((e) => e.id === eventId);
  if (!event || event.status !== "live") return [];
  const context = eventContext(event);
  const groups = event.groups.map<SheetRef>((_, group) => ({
    key: groupSheetKey(group),
    stage: "group",
    group,
    content: groupContent(shown, event, group),
  }));
  const knockout = event.matches
    .filter(isKnockoutSheet)
    .sort((x, y) => x.round - y.round || (x.position ?? 0) - (y.position ?? 0))
    .map<SheetRef>((match) => ({
      key: match.id,
      stage: "knockout",
      match,
      content: knockoutContent(shown, event, context, match),
    }));
  return [...groups, ...knockout];
}

/** 지금 대진표로 뽑으면 그 기록지에 찍힐 내용. 그 조·경기가 없어졌으면 null */
function currentContent(draw: Draw, event: DrawEvent, context: EventContext, key: string): SheetContent | null {
  const group = groupOfKey(key);
  if (group !== null) return group < event.groups.length ? groupContent(draw, event, group) : null;
  const match = event.matches.find((m) => m.id === key);
  return match && isKnockoutSheet(match) ? knockoutContent(draw, event, context, match) : null;
}

/** 무엇이 바뀌었는지 */
export type SheetChange =
  | { kind: "tables"; from: number[]; to: number[] }
  | { kind: "bestOf"; from: number; to: number }
  /** 종이에는 있지만 이제 없는 팀(out)과 종이에 없는 새 팀(in) */
  | { kind: "teams"; out: string[]; in: string[] }
  /** 본선 기록지의 '○조 1위' 같은 자리가 바뀜 (대진을 다시 확정해 본선 대진이 달라진 경우) */
  | { kind: "bracket" };

const sameList = <T,>(x: T[], y: T[]) => x.length === y.length && x.every((v, i) => v === y[i]);

/** 두 기록지 내용이 같은지 (칸 순서와 상관없이) */
const sameContent = (x: SheetContent, y: SheetContent) =>
  sameList(x.sides, y.sides) && sameList(x.tables, y.tables) && x.bestOf === y.bestOf;

/**
 * 종이에 찍힌 내용과 지금 내용의 다른 점.
 * - 팀: 조 기록지는 같은 팀들인지만 봅니다 (①②③ 순서만 바뀐 것은 종이로 경기하는 데 문제가 없습니다).
 *   본선 기록지에서 '○조 1위'처럼 비워 둔 자리는 그 자리에 팀이 정해져도 괜찮고, 자리 자체가 바뀌었을 때만 다릅니다.
 * - 테이블: 종이에 번호가 찍혀 있을 때만 봅니다 (비워 둔 칸은 손으로 적습니다).
 */
function changesOf(printed: SheetContent, current: SheetContent, slots?: string[]): SheetChange[] {
  const changes: SheetChange[] = [];
  if (slots) {
    let bracket = false;
    const out: string[] = [];
    const added: string[] = [];
    printed.sides.forEach((side, i) => {
      const now = current.sides[i] ?? "";
      if (isSlotKey(side)) {
        if (side !== slots[i]) bracket = true;
      } else if (side !== now) {
        out.push(side);
        if (!isSlotKey(now)) added.push(now);
      }
    });
    if (bracket) changes.push({ kind: "bracket" });
    if (out.length > 0) changes.push({ kind: "teams", out, in: added });
  } else {
    const out = printed.sides.filter((side) => !current.sides.includes(side));
    const added = current.sides.filter((side) => !printed.sides.includes(side));
    if (out.length > 0 || added.length > 0) changes.push({ kind: "teams", out, in: added });
  }
  if (printed.tables.length > 0 && !sameList(printed.tables, current.tables)) {
    changes.push({ kind: "tables", from: printed.tables, to: current.tables });
  }
  if (printed.bestOf !== current.bestOf) changes.push({ kind: "bestOf", from: printed.bestOf, to: current.bestOf });
  return changes;
}

export type SheetCheck = {
  key: string;
  stage: "group" | "knockout";
  group?: number;
  match?: DrawMatch;
  printed: PrintedSheet;
  /**
   * ok: 종이와 대진표가 같음 · changed: 다시 뽑아야 함 · gone: 조·경기가 없어져 더 쓰지 않는 종이(치우기)
   * done: 경기가 끝나 더 확인하지 않음 (종이는 기록으로만 남습니다)
   */
  state: "ok" | "changed" | "gone" | "done";
  changes: SheetChange[];
};

/** 뽑아 둔 기록지마다 지금 대진표와 맞는지. 조 기록지가 먼저이고, 본선은 라운드 순서입니다. */
export function printedChecks(draw: Draw, eventId: string): SheetCheck[] {
  const shown = withGroupTables(draw);
  const event = shown.events.find((e) => e.id === eventId);
  if (!event || event.status !== "live" || !event.printed) return [];
  const context = eventContext(event);
  const checks = Object.entries(event.printed).map(([key, printed]): SheetCheck => {
    const group = groupOfKey(key);
    const match = group === null ? event.matches.find((m) => m.id === key) : undefined;
    const base = {
      key,
      stage: group === null ? ("knockout" as const) : ("group" as const),
      ...(group !== null ? { group } : {}),
      ...(match ? { match } : {}),
      printed,
    };
    const current = currentContent(shown, event, context, key);
    if (!current) return { ...base, state: "gone", changes: [] };
    const finished = group !== null ? context.groupComplete(group) : Boolean(match && winnerOf(match, event));
    if (finished) return { ...base, state: "done", changes: [] };
    const slots = match ? [slotKey(match.a), slotKey(match.b)] : undefined;
    const changes = changesOf(printed, current, slots);
    return { ...base, state: changes.length > 0 ? "changed" : "ok", changes };
  });
  const order = (check: SheetCheck) =>
    check.group !== undefined
      ? [0, check.group, 0]
      : [1, check.match?.round ?? 99, check.match?.position ?? 0];
  return checks.sort((x, y) => {
    const [a, b] = [order(x), order(y)];
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  });
}

/** 다시 뽑거나 치워야 하는 기록지 */
export const needsAttention = (check: SheetCheck) => check.state === "changed" || check.state === "gone";

/** 바뀐 점 한 줄 (관리자 화면은 한국어만 있습니다) */
export function describeChange(change: SheetChange): string {
  const tables = (list: number[]) => (list.length > 0 ? `${list.join("·")}번` : "없음");
  switch (change.kind) {
    case "tables":
      return `테이블 ${tables(change.from)} → ${tables(change.to)}`;
    case "bestOf":
      return `경기 방식 ${change.from}세트 → ${change.to}세트`;
    case "teams":
      return [
        change.out.length > 0 ? `종이에만 있는 팀: ${change.out.join(", ")}` : "",
        change.in.length > 0 ? `새로 들어온 팀: ${change.in.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    case "bracket":
      return "본선 대진이 바뀜";
  }
}

/** 인쇄 페이지가 찍은 기록지 한 장 (뽑은 기록을 남길 때 서버로 보냅니다) */
export type PrintedRequest = { event: string; key: string; content: SheetContent };

/** 인쇄를 기록할 수 없는 까닭. 인쇄 페이지는 이 글을 받으면 새 내용을 다시 불러옵니다. */
export const STALE_PRINT =
  "기록지를 연 뒤 대진표가 바뀌었습니다. 새 내용으로 다시 불러왔으니 확인하고 다시 인쇄해 주세요.";

/**
 * 뽑은 기록지를 종목에 적어 둡니다. (draw 를 그 자리에서 고칩니다. 조 테이블은 미리 채워 두어야 합니다)
 * 종이에 찍힌 내용이 지금 대진표와 다르면 아무것도 적지 않고 false 를 돌려줍니다.
 */
export function recordPrinted(draw: Draw, sheets: PrintedRequest[], at: string): boolean {
  const contexts = new Map<DrawEvent, EventContext>();
  const updates: { event: DrawEvent; key: string; content: SheetContent }[] = [];
  for (const sheet of sheets) {
    const event = draw.events.find((e) => e.id === sheet.event);
    if (!event || event.status !== "live") return false;
    if (!contexts.has(event)) contexts.set(event, eventContext(event));
    const current = currentContent(draw, event, contexts.get(event)!, sheet.key);
    if (!current || !sameContent(current, sheet.content)) return false;
    updates.push({ event, key: sheet.key, content: current });
  }
  for (const { event, key, content } of updates) {
    event.printed = { ...event.printed, [key]: { ...content, at } };
  }
  return true;
}
