import { personKey } from "@/lib/draw/roster";
import { MAX_GAME_NAME } from "./play";

// 친선 경기의 이름 찾기. 띄어쓰기·대소문자를 무시하고, 한글 이름은 초성(ㅎㄱㄷ)으로도 찾습니다.

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

/** "홍길동" → "ㅎㄱㄷ". 한글 음절이 아닌 글자는 그대로 둡니다. */
export function initials(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHOSEONG[Math.floor(code / 588)] : ch;
    })
    .join("");
}

/** 찾는 글이 초성만으로 되어 있는지 ("ㅎㄱㄷ") */
const onlyInitials = (key: string) => /^[ㄱ-ㅎ]+$/.test(key);

/** 이름이 찾는 글과 맞는 정도. 0 이면 맞지 않고, 이름 앞부분이 맞으면 2 입니다. */
function score(name: string, key: string): number {
  const target = onlyInitials(key) ? initials(personKey(name)) : personKey(name);
  const at = target.indexOf(key);
  return at < 0 ? 0 : at === 0 ? 2 : 1;
}

/** 이름 목록에서 찾는 글과 맞는 이름. 앞부분이 맞는 이름이 먼저이고, 나머지는 목록 순서(최근에 쓴 순서)입니다. */
export function searchNames(names: string[], query: string, limit: number): string[] {
  const key = personKey(query);
  if (!key) return names.slice(0, limit);
  return names
    .map((name, index) => ({ name, index, score: score(name, key) }))
    .filter((item) => item.score > 0)
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .slice(0, limit)
    .map((item) => item.name);
}

/** 한 칸에 여러 이름을 붙여 넣었을 때 나눕니다. 줄바꿈·쉼표로 나누고 줄 앞의 번호("1.")는 뺍니다. */
export function splitNames(text: string): string[] {
  return text
    .split(/[\r\n,，、;]+/)
    .map((part) => part.replace(/^\s*\d+\s*[.)]\s*/, "").replace(/\s+/g, " ").trim().slice(0, MAX_GAME_NAME))
    .filter(Boolean);
}

export const sameName = (x: string, y: string) => personKey(x) === personKey(y);
