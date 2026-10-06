import type { Locale } from "@/lib/i18n/config";
import { site } from "@/lib/site";
import type { Tournament } from "@/lib/types";

// 날짜·시간을 글로 바꾸는 함수는 마지막 인자로 언어를 받습니다. 주지 않으면 한국어입니다.

const WEEKDAYS: Record<Locale, string[]> = {
  ko: ["일", "월", "화", "수", "목", "금", "토"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** 기간을 잇는 표시: "9:00 ~ 5:00" · "9:00 – 5:00" */
const RANGE_MARK: Record<Locale, string> = { ko: "~", en: "–" };
/** 날짜와 시간 사이: "9월 5일 (토) 오전 9:00" · "Sat, Sep 5, 9:00 AM" */
const TIME_JOINER: Record<Locale, string> = { ko: " ", en: ", " };

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

export function weekday(date: string, lang: Locale = "ko"): string {
  return WEEKDAYS[lang][new Date(parts(date).utc).getUTCDay()];
}

export function yearOf(date: string): number {
  return parts(date).y;
}

/** 2026년 9월 5일 (토) · Sat, Sep 5, 2026 */
export function formatDate(date: string, withYear = true, lang: Locale = "ko"): string {
  const { y, m, d } = parts(date);
  if (lang === "en") {
    const head = `${weekday(date, lang)}, ${MONTHS_EN[m - 1]} ${d}`;
    return withYear ? `${head}, ${y}` : head;
  }
  const head = withYear ? `${y}년 ` : "";
  return `${head}${m}월 ${d}일 (${weekday(date)})`;
}

/** 오전 9:00 · 9:00 AM */
export function formatTime(time: string, lang: Locale = "ko"): string {
  const [h, min] = time.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  const clock = `${hour}:${String(min).padStart(2, "0")}`;
  if (lang === "en") return `${clock} ${h < 12 ? "AM" : "PM"}`;
  return `${h < 12 ? "오전" : "오후"} ${clock}`;
}

export function endDateOf(t: Pick<Tournament, "startDate" | "endDate">) {
  return t.endDate && t.endDate > t.startDate ? t.endDate : t.startDate;
}

/**
 * 카드용 짧은 날짜: "9월 5일 (토)" 또는 "6월 27일 (토) ~ 28일 (일)"
 * 영어: "Sat, Sep 5" 또는 "Sat, Jun 27 – Sun, Jun 28"
 */
export function formatDateRange(
  t: Pick<Tournament, "startDate" | "endDate">,
  withYear = false,
  lang: Locale = "ko",
): string {
  const end = endDateOf(t);
  const start = formatDate(t.startDate, withYear, lang);
  if (end === t.startDate) return start;
  const s = parts(t.startDate);
  const e = parts(end);
  if (lang === "en") {
    // 영어는 연도를 날짜 뒤에 쓰므로, 같은 해라면 기간 끝에 한 번만 적습니다.
    const startLabel = formatDate(t.startDate, withYear && s.y !== e.y, lang);
    return `${startLabel} ${RANGE_MARK.en} ${formatDate(end, withYear, lang)}`;
  }
  if (s.y === e.y && s.m === e.m) return `${start} ~ ${e.d}일 (${weekday(end)})`;
  return `${start} ~ ${formatDate(end, withYear && s.y !== e.y)}`;
}

/**
 * 상세 페이지용 일시: "2026년 9월 5일 (토) 오전 9:00 ~ 오후 5:00"
 * 영어: "Sat, Sep 5, 2026, 9:00 AM – 5:00 PM"
 */
export function formatSchedule(
  t: Pick<Tournament, "startDate" | "endDate" | "startTime" | "endTime">,
  lang: Locale = "ko",
): string {
  const end = endDateOf(t);
  const mark = RANGE_MARK[lang];
  const joiner = TIME_JOINER[lang];
  const startTime = t.startTime ? formatTime(t.startTime, lang) : "";
  const endTime = t.endTime ? formatTime(t.endTime, lang) : "";
  const start = [formatDate(t.startDate, true, lang), startTime].filter(Boolean).join(joiner);

  if (end === t.startDate) return endTime ? `${start} ${mark} ${endTime}` : start;

  const sameYear = yearOf(end) === yearOf(t.startDate);
  const endLabel = [formatDate(end, !sameYear, lang), endTime].filter(Boolean).join(joiner);
  return `${start} ${mark} ${endLabel}`;
}

/**
 * 안내 카드용 일시. 날짜와 시간을 줄을 나눠 보여 줍니다.
 * 하루: ["2026년 9월 5일 (토)", "오전 9:00 ~ 오후 5:00"]
 * 여러 날: ["2026년 6월 27일 (토) 오전 8:00", "~ 6월 28일 (일) 오후 2:00"]
 */
export function scheduleLines(
  t: Pick<Tournament, "startDate" | "endDate" | "startTime" | "endTime">,
  lang: Locale = "ko",
): string[] {
  const end = endDateOf(t);
  const mark = RANGE_MARK[lang];
  const joiner = TIME_JOINER[lang];
  const startTime = t.startTime ? formatTime(t.startTime, lang) : "";
  const endTime = t.endTime ? formatTime(t.endTime, lang) : "";
  const startDate = formatDate(t.startDate, true, lang);

  if (end === t.startDate) {
    const time = [startTime, endTime].filter(Boolean).join(` ${mark} `);
    return time ? [startDate, time] : [startDate];
  }
  const sameYear = yearOf(end) === yearOf(t.startDate);
  const endLabel = [formatDate(end, !sameYear, lang), endTime].filter(Boolean).join(joiner);
  return [[startDate, startTime].filter(Boolean).join(joiner), `${mark} ${endLabel}`];
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

const daysLeft = (days: number) => `${days} ${days === 1 ? "day" : "days"}`;

/** "D-12", "D-DAY", "진행 중", "종료" · "In 12 days", "Today", "In progress", "Ended" */
export function statusLabel(
  t: Pick<Tournament, "startDate" | "endDate">,
  now = today(),
  lang: Locale = "ko",
): string {
  const status = statusOf(t, now);
  const en = lang === "en";
  if (status === "past") return en ? "Ended" : "종료";
  if (status === "ongoing") {
    if (now === t.startDate) return en ? "Today" : "D-DAY";
    return en ? "In progress" : "진행 중";
  }
  const days = daysBetween(now, t.startDate);
  if (en) return days === 1 ? "Tomorrow" : `In ${daysLeft(days)}`;
  return `D-${days}`;
}

/** 신청 접수 상태. 마감일이 없거나 대회가 끝났으면 null */
export function registrationLabel(
  t: Pick<Tournament, "startDate" | "endDate" | "deadline">,
  now = today(),
  lang: Locale = "ko",
): { open: boolean; label: string } | null {
  if (!t.deadline || statusOf(t, now) === "past") return null;
  const en = lang === "en";
  if (now > t.deadline) {
    return { open: false, label: en ? "Registration closed" : "접수 마감" };
  }
  const left = daysBetween(now, t.deadline);
  if (left === 0) {
    return { open: true, label: en ? "Registration closes today" : "오늘 접수 마감" };
  }
  return {
    open: true,
    label: en ? `Registration open · ${daysLeft(left)} left` : `접수 중 · 마감 D-${left}`,
  };
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
