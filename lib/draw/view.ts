import type { Draw, DrawEvent, DrawMatch } from "@/lib/types";
import { winnerOf, type EventContext, type QueueItem } from "./play";

// 화면에 보여 줄 때 필요한 계산 (최종 순위, 참가자별 지금 상태).

/** 실시간 대진표 화면이 받는 내용 (app/api/draws/[id]) */
export type DrawPayload = {
  draw: Draw;
  /** 방문자가 지금 점수를 입력할 수 있는지 */
  scoring: boolean;
};

export const groupLetter = (group: number) => String.fromCharCode(65 + group);

/** 본선 라운드에 오른 인원. 결승이 2 입니다. */
export function roundSize(event: DrawEvent, round: number): number {
  const first = event.matches.filter((m) => m.stage === "knockout" && m.round === 0).length * 2;
  return first / 2 ** round;
}

/** 본선 첫 라운드에서 한쪽이 부전승인 경기 */
export const isByeMatch = (match: DrawMatch) => "bye" in match.a || "bye" in match.b;

export type Podium = {
  first?: string;
  second?: string;
  /** 본선이 있으면 준결승에서 진 참가자(공동 3위), 리그만 했으면 조 3위 */
  thirds: string[];
  /** 본선 없이 조 하나로 끝난 종목 */
  league: boolean;
};

/** 종목의 최종 순위 (참가자 id). 아직 아무 순위도 정해지지 않았으면 null */
export function podium(context: EventContext): Podium | null {
  const { event } = context;
  const knockout = event.matches.filter((m) => m.stage === "knockout");
  if (knockout.length === 0) {
    if (event.groups.length !== 1 || !context.groupComplete(0)) return null;
    const rows = context.standings(0);
    return {
      first: rows[0]?.entry,
      second: rows[1]?.entry,
      thirds: rows[2] ? [rows[2].entry] : [],
      league: true,
    };
  }
  const last = Math.max(...knockout.map((m) => m.round));
  const result: Podium = { thirds: [], league: false };
  const loserOf = (match: DrawMatch) => {
    const winner = winnerOf(match, event.bestOf);
    const pair = context.pairOf(match);
    if (!winner || !pair) return null;
    return { won: pair[winner === "a" ? 0 : 1], lost: pair[winner === "a" ? 1 : 0] };
  };
  const final = knockout.find((m) => m.round === last);
  const decided = final && loserOf(final);
  if (decided) {
    result.first = decided.won;
    result.second = decided.lost;
  }
  for (const semi of knockout.filter((m) => m.round === last - 1 && !isByeMatch(m))) {
    const outcome = loserOf(semi);
    if (outcome) result.thirds.push(outcome.lost);
  }
  return result.first || result.thirds.length > 0 ? result : null;
}

export type EntryStatus =
  | { kind: "playing"; match: DrawMatch; opponent: string }
  | { kind: "queued"; match: DrawMatch; opponent: string; position: number; busy: boolean }
  | { kind: "waitingOpponent"; match: DrawMatch }
  | { kind: "waitingGroup" }
  | { kind: "outGroup"; group: number; rank: number }
  | { kind: "outRound"; round: number }
  | { kind: "champion" }
  | { kind: "finished" }
  | { kind: "notStarted" };

/** 참가자 한 명(팀)의 지금 상태: 경기 중인지, 몇 번째로 기다리는지, 어디서 경기를 마쳤는지 */
export function entryStatus(
  context: EventContext,
  queue: QueueItem[],
  entryId: string,
): EntryStatus {
  const { event } = context;
  if (event.status !== "live") return { kind: "notStarted" };

  const sideOf = (match: DrawMatch) => {
    const [a, b] = context.participants(match);
    if ("entry" in a && a.entry === entryId) return { mine: a, other: b };
    if ("entry" in b && b.entry === entryId) return { mine: b, other: a };
    return null;
  };
  const opponentOf = (match: DrawMatch) => {
    const other = sideOf(match)?.other;
    return other && "entry" in other ? other.entry : "";
  };

  const top = podium(context);
  if (top?.first === entryId) return { kind: "champion" };

  const playing = event.matches.find(
    (m) => sideOf(m) && context.stateOf(m) === "playing",
  );
  if (playing) return { kind: "playing", match: playing, opponent: opponentOf(playing) };

  const index = queue.findIndex((item) => item.event.id === event.id && sideOf(item.match));
  if (index >= 0) {
    const { match, busy } = queue[index];
    return { kind: "queued", match, opponent: opponentOf(match), position: index + 1, busy };
  }

  const waiting = event.matches.find((m) => sideOf(m) && context.stateOf(m) === "pending");
  if (waiting) return { kind: "waitingOpponent", match: waiting };

  const group = event.groups.findIndex((members) => members.includes(entryId));
  if (group >= 0 && !context.groupComplete(group)) return { kind: "waitingGroup" };

  const lost = event.matches.find((m) => {
    if (m.stage !== "knockout" || isByeMatch(m)) return false;
    const pair = context.pairOf(m);
    const winner = winnerOf(m, event.bestOf);
    return pair && winner && pair[winner === "a" ? 1 : 0] === entryId;
  });
  if (lost) return { kind: "outRound", round: lost.round };

  if (group >= 0) {
    const rank = context.standings(group).find((row) => row.entry === entryId)?.rank ?? 0;
    const hasKnockout = event.matches.some((m) => m.stage === "knockout");
    if (!hasKnockout || rank > event.advance) return { kind: "outGroup", group, rank };
  }
  return { kind: "finished" };
}
