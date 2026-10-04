import { site } from "@/lib/site";
import type { Tournament } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 대회 날짜는 '현지 달력 날짜'라서 시간대 변환 없이 UTC 기준으로만 다룹니다. */
function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, utc: Date.UTC(y, m - 1, d) };
}

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const { y, m, d, utc } = parts(date);
  const back = new Date(utc);
  return (
    back.getUTCFullYear() === y &&
    back.getUTCMonth() === m - 1 &&
    back.getUTCDate() === d
  );
}

/** 협회 시간대(미 동부) 기준 오늘 날짜 (YYYY-MM-DD) */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: site.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parts(to).utc - parts(from).utc) / 86_400_000);
}

export function addDays(date: string, days: number): string {
  return new Date(parts(date).utc + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

export function weekday(date: string): string {
  return WEEKDAYS[new Date(parts(date).utc).getUTCDay()];
}

export function yearOf(date: string): number {
  return parts(date).y;
}

/** 2026년 9월 5일 (토) */
export function formatDate(date: string, withYear = true): string {
  const { y, m, d } = parts(date);
  const head = withYear ? `${y}년 ` : "";
  return `${head}${m}월 ${d}일 (${weekday(date)})`;
}

/** 오전 9:00 */
export function formatTime(time: string): string {
  const [h, min] = time.split(":").map(Number);
  const period = h < 12 ? "오전" : "오후";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour}:${String(min).padStart(2, "0")}`;
}

export function endDateOf(t: Pick<Tournament, "startDate" | "endDate">) {
  return t.endDate && t.endDate > t.startDate ? t.endDate : t.startDate;
}

/** 카드용 짧은 날짜: "9월 5일 (토)" 또는 "6월 27일 (토) ~ 28일 (일)" */
export function formatDateRange(
  t: Pick<Tournament, "startDate" | "endDate">,
  withYear = false,
): string {
  const end = endDateOf(t);
  const start = formatDate(t.startDate, withYear);
  if (end === t.startDate) return start;
  const s = parts(t.startDate);
  const e = parts(end);
  if (s.y === e.y && s.m === e.m) return `${start} ~ ${e.d}일 (${weekday(end)})`;
  return `${start} ~ ${formatDate(end, withYear && s.y !== e.y)}`;
}

/** 상세 페이지용 일시: "2026년 9월 5일 (토) 오전 9:00 ~ 오후 5:00" */
export function formatSchedule(
  t: Pick<Tournament, "startDate" | "endDate" | "startTime" | "endTime">,
): string {
  const end = endDateOf(t);
  const startTime = t.startTime ? ` ${formatTime(t.startTime)}` : "";
  const endTime = t.endTime ? formatTime(t.endTime) : "";
  const start = `${formatDate(t.startDate)}${startTime}`;

  if (end === t.startDate) return endTime ? `${start} ~ ${endTime}` : start;

  const sameYear = yearOf(end) === yearOf(t.startDate);
  const endLabel = `${formatDate(end, !sameYear)}${endTime ? ` ${endTime}` : ""}`;
  return `${start} ~ ${endLabel}`;
}

/**
 * 안내 카드용 일시. 날짜와 시간을 줄을 나눠 보여 줍니다.
 * 하루: ["2026년 9월 5일 (토)", "오전 9:00 ~ 오후 5:00"]
 * 여러 날: ["2026년 6월 27일 (토) 오전 8:00", "~ 6월 28일 (일) 오후 2:00"]
 */
export function scheduleLines(
  t: Pick<Tournament, "startDate" | "endDate" | "startTime" | "endTime">,
): string[] {
  const end = endDateOf(t);
  const startTime = t.startTime ? formatTime(t.startTime) : "";
  const endTime = t.endTime ? formatTime(t.endTime) : "";

  if (end === t.startDate) {
    const time = [startTime, endTime].filter(Boolean).join(" ~ ");
    return time ? [formatDate(t.startDate), time] : [formatDate(t.startDate)];
  }
  const sameYear = yearOf(end) === yearOf(t.startDate);
  return [
    [formatDate(t.startDate), startTime].filter(Boolean).join(" "),
    ["~", formatDate(end, !sameYear), endTime].filter(Boolean).join(" "),
  ];
}

export type TournamentStatus = "upcoming" | "ongoing" | "past";

export function statusOf(
  t: Pick<Tournament, "startDate" | "endDate">,
  now = today(),
): TournamentStatus {
  if (now < t.startDate) return "upcoming";
  if (now <= endDateOf(t)) return "ongoing";
  return "past";
}

/** "D-12", "D-DAY", "진행 중", "종료" */
export function statusLabel(
  t: Pick<Tournament, "startDate" | "endDate">,
  now = today(),
): string {
  const status = statusOf(t, now);
  if (status === "past") return "종료";
  if (status === "ongoing") {
    return now === t.startDate ? "D-DAY" : "진행 중";
  }
  return `D-${daysBetween(now, t.startDate)}`;
}

/** 신청 접수 상태. 마감일이 없거나 대회가 끝났으면 null */
export function registrationLabel(
  t: Pick<Tournament, "startDate" | "endDate" | "deadline">,
  now = today(),
): { open: boolean; label: string } | null {
  if (!t.deadline || statusOf(t, now) === "past") return null;
  if (now > t.deadline) return { open: false, label: "접수 마감" };
  const left = daysBetween(now, t.deadline);
  return { open: true, label: left === 0 ? "오늘 접수 마감" : `접수 중 · 마감 D-${left}` };
}

/** Google 캘린더 '일정 추가' 링크 */
export function googleCalendarUrl(t: Tournament): string {
  const compact = (d: string) => d.replaceAll("-", "");
  const end = endDateOf(t);
  let dates: string;
  if (t.startTime) {
    const clock = (time: string) => `${time.replace(":", "")}00`;
    const endTime = t.endTime ?? t.startTime;
    dates = `${compact(t.startDate)}T${clock(t.startTime)}/${compact(end)}T${clock(endTime)}`;
  } else {
    // 종일 일정은 종료일이 '다음 날'(exclusive)이어야 합니다.
    dates = `${compact(t.startDate)}/${compact(addDays(end, 1))}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: t.title,
    dates,
    ctz: site.timeZone,
  });
  const location = [t.venue, t.address].filter(Boolean).join(", ");
  if (location) params.set("location", location);
  if (t.summary) params.set("details", t.summary);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function googleMapsUrl(t: Pick<Tournament, "venue" | "address">) {
  // 주소가 있으면 주소가 가장 정확합니다. 장소명만 있을 때만 장소명으로 검색합니다.
  const query = t.address || t.venue;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
