import type { Draw, DrawEntry, DrawEvent, DrawPlayer } from "@/lib/types";
import { makeGroups, seeded } from "./setup";

// 선수 명단과 체크인. 종목의 팀은 선수 이름으로 명단의 선수를 가리킵니다.
// 대회 날 접수 데스크에서 도착을 확인하고, 도착한 팀만으로 대진을 확정합니다.

export const MAX_PLAYERS = 400;

/** 이름을 비교할 때 쓰는 글. 띄어쓰기와 대소문자는 무시합니다. */
export const personKey = (name: string) => name.replace(/\s+/g, "").toLowerCase();

const idNumber = (player: DrawPlayer) => Number(player.id.slice(1)) || 0;

/**
 * 선수 명단. 저장된 명단에 없는 팀 이름은 뒤에 이어 붙입니다.
 * 명단 기능이 생기기 전에 팀만 붙여 넣은 대진표도 이렇게 명단을 갖게 됩니다.
 */
export function rosterOf(draw: Pick<Draw, "players" | "events">): DrawPlayer[] {
  const players = [...(draw.players ?? [])];
  const known = new Set(players.map((p) => personKey(p.name)));
  let next = Math.max(0, ...players.map(idNumber)) + 1;
  for (const event of draw.events) {
    for (const entry of event.entries) {
      for (const name of entry.players) {
        const key = personKey(name);
        if (known.has(key)) continue;
        known.add(key);
        players.push({ id: `p${next++}`, name });
      }
    }
  }
  return players;
}

export function playerByName(roster: DrawPlayer[], name: string): DrawPlayer | undefined {
  const key = personKey(name);
  return roster.find((p) => personKey(p.name) === key);
}

/** 체크인을 쓰는 대회인지. 따로 끄지 않았으면 씁니다. */
export const usesCheckIn = (draw: Pick<Draw, "checkIn">) => draw.checkIn !== false;

/** 팀이 도착했는지 알려 주는 함수. 체크인을 쓰지 않으면 늘 도착한 것으로 봅니다. */
export function presence(
  draw: Pick<Draw, "players" | "events" | "checkIn">,
): (entry: DrawEntry) => boolean {
  if (!usesCheckIn(draw)) return () => true;
  const arrived = new Set(
    rosterOf(draw)
      .filter((p) => p.checkedInAt)
      .map((p) => personKey(p.name)),
  );
  return (entry: DrawEntry) => entry.players.every((name) => arrived.has(personKey(name)));
}

/** 팀원 가운데 도착한 사람의 이름 */
export function arrivedPlayers(draw: Pick<Draw, "players" | "events">, entry: DrawEntry): string[] {
  const roster = rosterOf(draw);
  return entry.players.filter((name) => playerByName(roster, name)?.checkedInAt);
}

/** 팀 레이팅. 팀원 모두 레이팅이 있을 때만 그 합을 돌려줍니다. */
export function teamRating(roster: DrawPlayer[], names: string[]): number | undefined {
  const ratings = names.map((name) => playerByName(roster, name)?.rating);
  return ratings.every((r) => typeof r === "number")
    ? ratings.reduce<number>((sum, r) => sum + (r ?? 0), 0)
    : undefined;
}

/** 같은 종목에서 이 선수가 들어 있는 팀. 대진 확정 때 빠진 팀은 치지 않습니다. */
export const teamOf = (event: DrawEvent, name: string) =>
  event.entries.find(
    (entry) =>
      entry.absent !== "excluded" && entry.players.some((p) => personKey(p) === personKey(name)),
  );

export type StartPlan = {
  /** 확정할 조 편성 */
  groups: string[][];
  /** 오지 않아 빠지는 팀 */
  excluded: string[];
  /** 오지 않았지만 조에 남겨 두고 기다리는 팀 */
  waiting: string[];
  /** 빈자리가 많아 조를 다시 나눴는지 */
  regrouped: boolean;
};

/**
 * 대진 확정 계획. 도착한 팀과 기다리기로 한 팀만 남깁니다.
 * 미리 만든 조 편성은 그대로 두고 빠진 팀만 지우되, 한 조가 너무 작아지면 조를 다시 나눕니다.
 * 미리 만든 조에 없는 팀(당일 새로 짝지은 팀)은 인원이 적은 조에 넣습니다.
 */
export function planStart(
  event: DrawEvent,
  isPresent: (entry: DrawEntry) => boolean,
  waiting: ReadonlySet<string>,
): StartPlan | { error: string } {
  const keep = event.entries.filter((e) => isPresent(e) || waiting.has(e.id));
  const keepIds = new Set(keep.map((e) => e.id));
  const excluded = event.entries.filter((e) => !keepIds.has(e.id)).map((e) => e.id);
  const waitingIds = keep.filter((e) => !isPresent(e)).map((e) => e.id);
  if (keep.length < 2) {
    return { error: "대진을 만들려면 도착한 팀이 두 팀(명) 이상 있어야 합니다." };
  }

  // 빠진 팀 때문에 이보다 작아진 조가 생기면 조를 다시 나눕니다. (관리자가 일부러 작게 만든 조는 그대로 둡니다)
  const minSize = Math.max(2, event.groupSize - 1);
  const known = new Set(event.entries.map((e) => e.id));
  const trimmed = event.groups.map((members) => {
    const left = members.filter((id) => keepIds.has(id));
    return { left, shrunk: left.length < members.filter((id) => known.has(id)).length };
  });
  let groups = trimmed.map(({ left }) => left).filter((members) => members.length > 0);
  let regrouped =
    groups.length === 0 ||
    groups.some((members) => members.length < 2) ||
    (groups.length > 1 && trimmed.some(({ left, shrunk }) => shrunk && left.length < minSize));

  if (!regrouped) {
    const placed = new Set(groups.flat());
    for (const entry of seeded(keep.filter((e) => !placed.has(e.id)))) {
      const next = placeInSmallest(groups, entry.id, keep, event.groupSize);
      if (!next) {
        regrouped = true;
        break;
      }
      groups = next;
    }
  }

  if (regrouped) groups = makeGroups(keep, event.groupSize);
  return { groups, excluded, waiting: waitingIds, regrouped };
}

/**
 * 조 편성에 없는 팀 하나를 인원이 가장 적은 조에 넣습니다. 조 안은 시드 순서로 다시 세웁니다.
 * 모든 조가 꽉 찼으면 null 입니다.
 */
export function placeInSmallest(
  groups: string[][],
  entryId: string,
  entries: DrawEntry[],
  groupSize: number,
): string[][] | null {
  if (groups.length === 0) return [[entryId]];
  const smallest = groups.reduce(
    (best, members, i) => (members.length < groups[best].length ? i : best),
    groups.length - 1,
  );
  if (groups[smallest].length >= groupSize) return null;
  const order = seeded(entries).map((e) => e.id);
  return groups.map((members, i) =>
    i === smallest
      ? [...members, entryId].sort((x, y) => order.indexOf(x) - order.indexOf(y))
      : members,
  );
}
