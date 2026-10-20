import type { DrawEntry, DrawEvent, DrawMatch, DrawSlot } from "@/lib/types";

// 조 편성과 경기 목록 만들기.
// 예선 조는 레이팅 순서로 지그재그 배치하고, 같은 소속은 되도록 다른 조로 나눕니다.
// 본선은 조 1위를 시드 자리에 두고, 같은 조 2위는 반대쪽에 놓습니다.

/** 조마다의 인원. 한 조가 groupSize 보다 두 명 이상 모자라지 않게 조 수를 정합니다. */
export function groupSizes(count: number, groupSize: number): number[] {
  if (count <= 0) return [];
  let groups = Math.ceil(count / groupSize);
  while (groups > 1 && count < groups * (groupSize - 1)) groups -= 1;
  const base = Math.floor(count / groups);
  const extra = count % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
}

/** 레이팅이 높은 순서. 레이팅이 없는 참가자는 적은 순서대로 뒤에 둡니다. */
export function seeded(entries: DrawEntry[]): DrawEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (x, y) =>
        (y.entry.rating ?? -1) - (x.entry.rating ?? -1) || x.index - y.index,
    )
    .map(({ entry }) => entry);
}

const sameClubPairs = (group: DrawEntry[]) => {
  let pairs = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i].club?.trim().toLowerCase();
      if (a && a === group[j].club?.trim().toLowerCase()) pairs += 1;
    }
  }
  return pairs;
};

/** 자동 조 편성. 조마다 참가자 id 를 시드 순서대로 돌려줍니다. */
export function makeGroups(entries: DrawEntry[], groupSize: number): string[][] {
  const sizes = groupSizes(entries.length, groupSize);
  const groups: DrawEntry[][] = sizes.map(() => []);
  const order = seeded(entries);

  // 1번 시드부터 A조 → 끝 조, 다음 줄은 끝 조 → A조 순서로 채웁니다.
  let next = 0;
  for (let row = 0; next < order.length; row++) {
    const indexes = groups.map((_, i) => i);
    if (row % 2 === 1) indexes.reverse();
    for (const i of indexes) {
      if (next < order.length && groups[i].length < sizes[i]) groups[i].push(order[next++]);
    }
  }

  // 같은 줄(비슷한 레이팅)끼리 자리를 바꿔 같은 소속이 한 조에 몰리지 않게 합니다.
  // 각 조의 1번 시드는 본선 자리와 이어지므로 옮기지 않습니다.
  for (let pass = 0; pass < 20; pass++) {
    let improved = false;
    for (let row = 1; row < groupSize + 1; row++) {
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          if (!groups[i][row] || !groups[j][row]) continue;
          const before = sameClubPairs(groups[i]) + sameClubPairs(groups[j]);
          [groups[i][row], groups[j][row]] = [groups[j][row], groups[i][row]];
          const after = sameClubPairs(groups[i]) + sameClubPairs(groups[j]);
          if (after < before) improved = true;
          else [groups[i][row], groups[j][row]] = [groups[j][row], groups[i][row]];
        }
      }
    }
    if (!improved) break;
  }

  return groups.map((group) => group.map((entry) => entry.id));
}

/**
 * 조별 리그의 경기 순서. [차례, 시드 번호 a, 시드 번호 b] (0부터)
 * 3·4명 조는 흔히 쓰는 순서(1-3, 1-2, 2-3 / 1-4, 2-3, 1-3, 2-4, 1-2, 3-4)를 따르고,
 * 그보다 많으면 한 사람씩 돌아가며 짝을 바꾸는 방식으로 모든 짝을 한 번씩 만듭니다.
 */
export function roundRobin(size: number): [number, number, number][] {
  if (size === 3) {
    return [
      [0, 0, 2],
      [1, 0, 1],
      [2, 1, 2],
    ];
  }
  if (size === 4) {
    return [
      [0, 0, 3],
      [0, 1, 2],
      [1, 0, 2],
      [1, 1, 3],
      [2, 0, 1],
      [2, 2, 3],
    ];
  }
  const ring = Array.from({ length: size % 2 === 0 ? size : size + 1 }, (_, i) => i);
  const pairs: [number, number, number][] = [];
  for (let round = 0; round < ring.length - 1; round++) {
    for (let k = 0; k < ring.length / 2; k++) {
      const a = ring[k];
      const b = ring[ring.length - 1 - k];
      if (a < size && b < size) pairs.push([round, Math.min(a, b), Math.max(a, b)]);
    }
    // 첫 자리는 그대로 두고 나머지를 한 칸씩 돌립니다.
    ring.splice(1, 0, ring.pop()!);
  }
  return pairs;
}

/** 시드 번호(1부터)가 대진표 몇 번째 자리에 들어가는지. 크기 8 → [1, 8, 4, 5, 2, 7, 3, 6] */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const length = order.length * 2;
    order = order.flatMap((seed) => [seed, length + 1 - seed]);
  }
  return order;
}

/** 두 자리가 몇 번째 라운드에서 처음 만날 수 있는지 (1 = 첫 라운드) */
const meetingRound = (x: number, y: number) => Math.floor(Math.log2(x ^ y)) + 1;

/**
 * 본선 첫 라운드의 자리들. 조 수 × 진출 인원을 2의 거듭제곱 칸에 넣고, 남는 칸은 부전승입니다.
 * 조 1위는 시드 순서(A조 1위 = 1번 시드)대로 놓고, 2위는 같은 조 1위와 되도록 늦게 만나도록 놓습니다.
 */
export function knockoutSlots(groupCount: number, advance: number): DrawSlot[] {
  const qualifiers = groupCount * advance;
  let size = 2;
  while (size < qualifiers) size *= 2;
  const order = seedOrder(size);
  const slots: DrawSlot[] = order.map((seed) =>
    seed > qualifiers ? { bye: true } : { group: -1, rank: 0 },
  );

  // 1위
  order.forEach((seed, slot) => {
    if (seed <= groupCount) slots[slot] = { group: seed - 1, rank: 1 };
  });
  if (advance === 1) return slots;

  // 2위 이하: 조마다 1위 자리와 가장 늦게 만나는 자리를 고릅니다.
  // 조가 8개 이하면 모든 경우를 따져 보고, 더 많으면 앞 조부터 차례로 고릅니다.
  const winnerSlot = (group: number) => order.indexOf(group + 1);
  for (let rank = 2; rank <= advance; rank++) {
    const free = order
      .map((seed, slot) => ({ seed, slot }))
      .filter(({ seed }) => seed > groupCount * (rank - 1) && seed <= groupCount * rank)
      .map(({ slot }) => slot);
    const groups = Array.from({ length: groupCount }, (_, g) => g);
    let best: number[] = [];
    let bestScore = -1;

    if (groupCount <= 8) {
      const used = new Array<boolean>(free.length).fill(false);
      const pick: number[] = [];
      const search = (g: number, score: number) => {
        if (g === groupCount) {
          if (score > bestScore) {
            bestScore = score;
            best = [...pick];
          }
          return;
        }
        for (let k = 0; k < free.length; k++) {
          if (used[k]) continue;
          const meet = meetingRound(winnerSlot(g), free[k]);
          if (meet === 1) continue;
          used[k] = true;
          pick.push(free[k]);
          search(g + 1, score + meet * meet);
          pick.pop();
          used[k] = false;
        }
      };
      search(0, 0);
    }
    if (best.length !== groupCount) {
      const left = [...free];
      best = groups.map((g) => {
        left.sort((x, y) => meetingRound(winnerSlot(g), y) - meetingRound(winnerSlot(g), x));
        return left.shift()!;
      });
    }
    groups.forEach((g) => {
      slots[best[g]] = { group: g, rank };
    });
  }
  return slots;
}

export const groupMatchId = (eventId: string, group: number, index: number) =>
  `${eventId}-g${group}-${index}`;
export const knockoutMatchId = (eventId: string, round: number, position: number) =>
  `${eventId}-k${round}-${position}`;

/** 확정한 조 편성으로 예선·본선 경기를 모두 만듭니다. 조가 하나면 본선 없이 리그로 끝납니다. */
export function buildMatches(event: Pick<DrawEvent, "id" | "groups" | "advance">): DrawMatch[] {
  const matches: DrawMatch[] = [];

  event.groups.forEach((members, group) => {
    roundRobin(members.length).forEach(([round, x, y], index) => {
      matches.push({
        id: groupMatchId(event.id, group, index),
        stage: "group",
        group,
        round,
        a: { entry: members[x] },
        b: { entry: members[y] },
      });
    });
  });

  if (event.groups.length < 2) return matches;

  const first = knockoutSlots(event.groups.length, event.advance);
  let count = first.length / 2;
  for (let round = 0; count >= 1; round++, count /= 2) {
    for (let position = 0; position < count; position++) {
      matches.push({
        id: knockoutMatchId(event.id, round, position),
        stage: "knockout",
        round,
        position,
        a: round === 0 ? first[position * 2] : { winnerOf: knockoutMatchId(event.id, round - 1, position * 2) },
        b:
          round === 0
            ? first[position * 2 + 1]
            : { winnerOf: knockoutMatchId(event.id, round - 1, position * 2 + 1) },
      });
    }
  }
  return matches;
}
