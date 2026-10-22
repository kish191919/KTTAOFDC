import type { Draw } from "@/lib/types";
import { isEventFinished } from "./play";

// 관리 화면 목록에서 대진표가 어디까지 왔는지 한눈에 보여 주는 요약입니다.

/** setup: 종목·참가 팀 등록 중, live: 경기 진행 중, done: 모든 종목의 경기가 끝남, closed: 마감 */
export type DrawStage = "setup" | "live" | "done" | "closed";

/** 관리 화면(한국어)에서 보여 주는 이름 */
export const drawStageLabel: Record<DrawStage, string> = {
  setup: "준비 중",
  live: "경기 중",
  done: "경기 끝",
  closed: "마감",
};

/** closed 는 lib/draw/play.ts 의 isDrawClosed 로 정합니다. (대회 날짜가 있어야 알 수 있어서 따로 받습니다) */
export function drawStage(draw: Pick<Draw, "events">, closed = false): DrawStage {
  if (closed) return "closed";
  const live = draw.events.filter((event) => event.status === "live");
  if (live.length === 0) return "setup";
  return live.length === draw.events.length && live.every(isEventFinished) ? "done" : "live";
}
