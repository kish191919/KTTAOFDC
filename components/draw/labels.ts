import { entryName } from "@/lib/draw/entries";
import type { EventContext } from "@/lib/draw/play";
import { groupLetter, isByeMatch, roundSize } from "@/lib/draw/view";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { site } from "@/lib/site";
import type { DrawEvent, DrawMatch, DrawSlot } from "@/lib/types";

// 대진표 화면에 쓰는 이름표: 종목 이름, "A조", "A조 1위", "8강 1경기 승자" 같은 글

type T = Dictionary["draw"];

export const eventName = (event: DrawEvent, lang: Locale) =>
  (lang === "en" && event.nameEn) || event.name;

/** "A조" · "8강 1경기" · "결승". 예선 경기는 순서가 자유라 번호를 붙이지 않습니다. */
export function matchLabel(event: DrawEvent, match: DrawMatch, t: T): string {
  if (match.stage === "group") return t.group(groupLetter(match.group ?? 0));
  const size = roundSize(event, match.round);
  return size <= 2 ? t.round(size) : `${t.round(size)} ${t.matchNo((match.position ?? 0) + 1)}`;
}

/** 아직 참가자가 정해지지 않은 자리의 이름 */
export function slotLabel(slot: DrawSlot, context: EventContext, t: T): string {
  if ("entry" in slot) {
    const entry = context.entryById.get(slot.entry);
    return entry ? entryName(entry) : "?";
  }
  if ("bye" in slot) return t.bye;
  if ("group" in slot) return t.groupRank(groupLetter(slot.group), slot.rank);
  const previous = context.matchById.get(slot.winnerOf);
  if (!previous) return "?";
  // 부전승 경기는 거치지 않고 그 앞의 자리 이름을 씁니다.
  if (isByeMatch(previous)) return slotLabel("bye" in previous.a ? previous.b : previous.a, context, t);
  return t.winnerOf(matchLabel(context.event, previous, t));
}

/** 경기 한쪽의 이름. 정해졌으면 참가자 이름이고, 아니면 자리 이름입니다. */
export function sideName(
  match: DrawMatch,
  side: "a" | "b",
  context: EventContext,
  t: T,
): { name: string; entry?: string } {
  const resolved = context.participants(match)[side === "a" ? 0 : 1];
  if ("entry" in resolved) {
    const entry = context.entryById.get(resolved.entry);
    return { name: entry ? entryName(entry) : "?", entry: resolved.entry };
  }
  return { name: slotLabel(match[side], context, t) };
}

/** 두 참가자 이름 "김수미 · 이도임 vs 정경리 · Hanna Kim". 예선 경기를 글로 가리킬 때 씁니다. */
export const matchup = (match: DrawMatch, context: EventContext, t: T) =>
  `${sideName(match, "a", context, t).name} ${t.versus} ${sideName(match, "b", context, t).name}`;

/** 게임별 점수 "11-7, 9-11, 11-5" */
export const pointsText = (match: DrawMatch) =>
  (match.points ?? []).map(([a, b]) => `${a}-${b}`).join(", ");

/** 대회 현지 시각 "오후 1:05" · "1:05 PM" */
export function clockTime(value: string | number, lang: Locale, seconds = false): string {
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(seconds ? { second: "2-digit" } : {}),
    timeZone: site.timeZone,
  }).format(new Date(value));
}
