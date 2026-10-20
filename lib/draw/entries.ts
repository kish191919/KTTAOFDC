import type { DrawEntry } from "@/lib/types";

// 관리자가 엑셀·구글 시트에서 복사해 붙여 넣은 참가자 목록을 읽습니다.
// 한 줄에 한 명(복식은 한 팀)이고, 칸은 탭·쉼표·빗금(/)으로 나눕니다.
//   복식: "홍길동 / 김철수, 1200, KCPC"   (레이팅을 두 개 적으면 더합니다)
//   단식: "홍길동, 1500, KCPC"
// 숫자는 레이팅, 나머지는 앞에서부터 선수 이름이고 그다음 칸이 소속입니다.

export const MAX_ENTRIES = 128;
const MAX_NAME = 40;
const MAX_RATING = 9999;

export type ParsedEntries = {
  entries: DrawEntry[];
  /** 팀원마다 레이팅을 따로 적은 경우 그 값 (entries 와 같은 순서). 명단에 개인 레이팅으로 넣습니다. */
  ratings: (number[] | undefined)[];
  errors: string[];
};

/** 참가자 이름. 복식은 "홍길동 / 김철수" */
export const entryName = (entry: Pick<DrawEntry, "players">) => entry.players.join(" / ");

const normalize = (name: string) => name.replace(/\s+/g, "").toLowerCase();

export function parseEntries(text: string, doubles: boolean): ParsedEntries {
  const entries: DrawEntry[] = [];
  const ratings: (number[] | undefined)[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();
  const need = doubles ? 2 : 1;

  text.split(/\r?\n/).forEach((raw, index) => {
    const lineNo = index + 1;
    // 줄 앞의 "1." "2)" 같은 번호는 뺍니다.
    const line = raw.replace(/^\s*\d+\s*[.)]\s+/, "").trim();
    if (!line) return;

    const names: string[] = [];
    const numbers: number[] = [];
    for (const cell of line.split(/[\t,/]/)) {
      const words = cell.trim().split(/\s+/).filter(Boolean);
      const nameWords: string[] = [];
      for (const word of words) {
        if (/^\d+$/.test(word)) numbers.push(Number(word));
        else nameWords.push(word);
      }
      if (nameWords.length > 0) names.push(nameWords.join(" "));
    }

    if (names.length < need) {
      errors.push(`${lineNo}번째 줄: ${doubles ? "두 사람의 이름" : "이름"}이 필요합니다. (${line})`);
      return;
    }
    if (names.length > need + 1) {
      errors.push(`${lineNo}번째 줄: 이름이 너무 많습니다. 한 줄에 ${doubles ? "한 팀" : "한 명"}만 적어 주세요. (${line})`);
      return;
    }
    if (names.some((name) => name.length > MAX_NAME)) {
      errors.push(`${lineNo}번째 줄: 이름이 너무 깁니다.`);
      return;
    }
    if (numbers.some((n) => n > MAX_RATING) || numbers.length > need) {
      errors.push(`${lineNo}번째 줄: 레이팅을 읽지 못했습니다. (${line})`);
      return;
    }

    const players = names.slice(0, need);
    const duplicate = players.find((name) => seen.has(normalize(name)));
    if (duplicate) {
      errors.push(
        `${lineNo}번째 줄: ${duplicate} 님이 ${seen.get(normalize(duplicate))}번째 줄에도 있습니다.`,
      );
      return;
    }
    players.forEach((name) => seen.set(normalize(name), lineNo));

    const club = names[need];
    ratings.push(numbers.length === need ? numbers : undefined);
    entries.push({
      id: `e${entries.length + 1}`,
      players,
      ...(numbers.length > 0 ? { rating: numbers.reduce((sum, n) => sum + n, 0) } : {}),
      ...(club ? { club } : {}),
    });
  });

  if (entries.length > MAX_ENTRIES) {
    errors.push(`한 종목에는 ${MAX_ENTRIES}${doubles ? "팀" : "명"}까지 넣을 수 있습니다.`);
  }
  return { entries, ratings, errors };
}

export type ParsedPerson = { name: string; rating?: number; club?: string };

/**
 * 선수 명단에 붙여 넣은 글. 한 줄에 한 명이고 "이름, 레이팅, 소속" 순서입니다.
 * 레이팅과 소속은 빼도 됩니다.
 */
export function parsePeople(text: string): { people: ParsedPerson[]; errors: string[] } {
  const people: ParsedPerson[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/^\s*\d+\s*[.)]\s+/, "").trim();
    if (!line) return;
    const names: string[] = [];
    const numbers: number[] = [];
    for (const cell of line.split(/[\t,]/)) {
      const words = cell.trim().split(/\s+/).filter(Boolean);
      const nameWords = words.filter((w) => !/^\d+$/.test(w));
      words.filter((w) => /^\d+$/.test(w)).forEach((w) => numbers.push(Number(w)));
      if (nameWords.length > 0) names.push(nameWords.join(" "));
    }
    const lineNo = index + 1;
    if (names.length === 0) return errors.push(`${lineNo}번째 줄: 이름이 없습니다. (${line})`);
    if (names.length > 2 || numbers.length > 1 || numbers.some((n) => n > MAX_RATING)) {
      return errors.push(`${lineNo}번째 줄: 한 줄에 한 사람만 "이름, 레이팅, 소속" 순서로 적어 주세요. (${line})`);
    }
    if (names[0].length > MAX_NAME) return errors.push(`${lineNo}번째 줄: 이름이 너무 깁니다.`);
    const key = normalize(names[0]);
    if (seen.has(key)) return errors.push(`${lineNo}번째 줄: ${names[0]} 님이 두 번 적혀 있습니다.`);
    seen.add(key);
    people.push({
      name: names[0],
      ...(numbers.length > 0 ? { rating: numbers[0] } : {}),
      ...(names[1] ? { club: names[1].slice(0, MAX_NAME) } : {}),
    });
  });
  return { people, errors };
}

/** 저장된 참가자를 다시 고칠 수 있게 붙여 넣는 글 모양으로 돌려놓습니다. */
export function entriesToText(entries: DrawEntry[]): string {
  return entries
    .map((entry) => {
      const cells = [entryName(entry), entry.rating ?? "", entry.club ?? ""];
      while (cells.length > 1 && cells[cells.length - 1] === "") cells.pop();
      return cells.join(", ");
    })
    .join("\n");
}
