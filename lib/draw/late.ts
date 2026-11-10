import type { DrawEvent, DrawLog, DrawMatch } from "@/lib/types";
import { groupCapacity, isStarted } from "./play";
import { teamOf } from "./roster";
import { groupMatchId, roundRobin, seeded } from "./setup";
import { groupLetter } from "./view";

// 대진을 확정한 뒤 늦게 온 팀 넣기.
// 확정할 때 도착하지 않아 빠진 팀(absent: "excluded")을, 아직 경기를 시작하지 않은 조 하나에 넣습니다.
// 그 조의 경기 목록만 새로 만들고, 다른 조 · 본선 대진 · 입력한 점수는 그대로 둡니다. (조 수가 같아 본선 자리도 같습니다)
// 서버(lib/draw/admin.ts 의 lateEntry)와 관리자 화면(넣을 수 있는 조 고르기)이 같은 함수를 씁니다.

/** 늦게 온 팀을 넣은 뒤 한 조의 최대 인원 (종목 설정에서 고를 수 있는 한 조 인원의 최대와 같습니다) */
export const MAX_LATE_GROUP = 6;

/** 조 수가 n 인 리그의 경기 수 */
export const leagueMatches = (n: number) => (n * (n - 1)) / 2;

export type LateGroup = {
  group: number;
  size: number;
  /**
   * 넣을 수 없는 까닭. started: 점수(기권승 포함)가 들어갔거나 테이블에 올린 경기가 있음,
   * full: 이미 MAX_LATE_GROUP 팀
   */
  blocked?: "started" | "full";
};

const groupMatchesOf = (event: DrawEvent, group: number) =>
  event.matches.filter((m) => m.stage === "group" && m.group === group);

/**
 * 조마다 늦게 온 팀을 넣을 수 있는지. 경기를 시작한 조는 넣을 수 없습니다.
 * 테이블에 올리기만 하고 점수가 없는 경기도 실제로 치고 있을 수 있어 시작한 것으로 봅니다. (잘못 올렸으면 배정을 취소한 뒤 넣습니다)
 */
export function lateEntryGroups(event: DrawEvent): LateGroup[] {
  return event.groups.map((members, group) => {
    const started = groupMatchesOf(event, group).some((m) => isStarted(m) || m.table !== undefined);
    const blocked = started ? "started" : members.length >= MAX_LATE_GROUP ? "full" : undefined;
    return { group, size: members.length, ...(blocked ? { blocked } : {}) };
  });
}

/** 넣기를 권하는 조: 넣을 수 있는 조 가운데 인원이 가장 적은 조 (같으면 앞 조). 없으면 null */
export function suggestedLateGroup(event: DrawEvent): number | null {
  const open = lateEntryGroups(event).filter((g) => !g.blocked);
  if (open.length === 0) return null;
  return open.reduce((best, g) => (g.size < best.size ? g : best)).group;
}

/** 다시 만든 조 경기의 id. 예전 경기와 겹치지 않게 뒤에 -v2, -v3 … 을 붙입니다. */
function nextVersion(old: DrawMatch[]): number {
  const versions = old.map((m) => Number(/-v(\d+)$/.exec(m.id)?.[1] ?? 1));
  return Math.max(1, ...versions) + 1;
}

/**
 * 늦게 온 팀을 조에 넣습니다. (event 를 그 자리에서 고칩니다. 조 테이블은 settle 로 맞춥니다)
 * - 조 안은 시드(레이팅) 순서로 다시 세우고, 그 조의 리그 경기를 새로 만듭니다.
 * - 새 경기 id 는 예전 것과 다릅니다. 바뀌기 전 화면을 열어 둔 휴대폰이 예전 경기 id 로 점수를 보내면
 *   '경기를 찾을 수 없음'으로 거절되고, 열려 있던 점수 창도 닫힙니다.
 * - 동시에 칠 수 있는 경기 수가 달라지면(3팀 → 4팀) 그 조의 함께 쓰는 테이블을 다시 정하게 비웁니다.
 * - 예전 경기를 가리키는 입력 기록(결과 지우기 기록만 있을 수 있음)은 지웁니다.
 */
export function addLateEntry(
  event: DrawEvent,
  entryId: string,
  group: number,
  log: DrawLog[],
): { log: DrawLog[] } | { error: string } {
  const unit = event.doubles ? "팀" : "선수";
  const entry = event.entries.find((e) => e.id === entryId);
  if (!entry || entry.absent !== "excluded") {
    return { error: `대진 확정 때 빠진 ${unit}이 아닙니다. 화면을 새로 고쳐 주세요.` };
  }
  const choice = lateEntryGroups(event)[group];
  if (!choice) return { error: "조를 찾을 수 없습니다. 화면을 새로 고쳐 주세요." };
  const letter = `${groupLetter(group)}조`;
  if (choice.blocked === "started") {
    return {
      error: `${letter}는 이미 경기를 시작했습니다 (점수가 있거나 테이블에 올린 경기가 있음). 아직 시작하지 않은 조를 골라 주세요.`,
    };
  }
  if (choice.blocked === "full") return { error: `${letter}는 이미 ${MAX_LATE_GROUP}${unit === "팀" ? "팀" : "명"}입니다.` };
  // 그 사이 팀원이 이 종목의 다른 팀에 들어갔으면(선수 바꾸기) 넣지 않습니다.
  const busy = entry.players.find((name) => teamOf(event, name));
  if (busy) return { error: `${busy} 님은 이 종목의 다른 ${unit}에 들어 있어 넣을 수 없습니다.` };

  const order = seeded(event.entries).map((e) => e.id);
  const before = event.groups[group];
  const members = [...before, entry.id].sort((x, y) => order.indexOf(x) - order.indexOf(y));
  const old = groupMatchesOf(event, group);
  const oldIds = new Set(old.map((m) => m.id));
  const version = nextVersion(old);
  const fresh: DrawMatch[] = roundRobin(members.length).map(([round, x, y], index) => ({
    id: `${groupMatchId(event.id, group, index)}-v${version}`,
    stage: "group",
    group,
    round,
    a: { entry: members[x] },
    b: { entry: members[y] },
  }));
  // 예전 경기가 있던 자리에 새 경기를 넣어 경기 순서(조 → 본선)를 지킵니다.
  const at = event.matches.findIndex((m) => oldIds.has(m.id));
  const rest = event.matches.filter((m) => !oldIds.has(m.id));
  const insertAt = at < 0 ? rest.filter((m) => m.stage === "group" && (m.group ?? 0) < group).length : at;
  event.matches = [...rest.slice(0, insertAt), ...fresh, ...rest.slice(insertAt)];
  event.groups = event.groups.map((g, i) => (i === group ? members : g));
  delete entry.absent;

  if (
    groupCapacity(members.length) !== groupCapacity(before.length) &&
    event.extraTables?.length === event.groups.length
  ) {
    event.extraTables = event.extraTables.map((list, i) => (i === group ? null : list));
  }
  return { log: log.filter((item) => item.event !== event.id || !oldIds.has(item.match)) };
}
