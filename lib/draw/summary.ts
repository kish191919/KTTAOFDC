import type { Draw, DrawEvent } from "@/lib/types";
import { eventContext } from "./play";

// 관리 화면 목록에서 대진표가 어디까지 왔는지 한눈에 보여 주는 요약입니다.

/** setup: 종목·참가 팀 등록 중, live: 경기 진행 중, done: 모든 종목의 경기가 끝남 */
export type DrawStage = "setup" | "live" | "done";

/** 관리 화면(한국어)에서 보여 주는 이름 */
export const drawStageLabel: Record<DrawStage, string> = {
  setup: "준비 중",
  live: "경기 중",
  done: "경기 끝",
};

/** 부전승을 뺀 모든 경기의 승패가 정해진 종목 */
function isFinished(event: DrawEvent): boolean {
  const context = eventContext(event);
  return event.matches.every((match) => {
    const state = context.stateOf(match);
    return state === "done" || state === "bye";
  });
}

export function drawStage(draw: Pick<Draw, "events">): DrawStage {
  const live = draw.events.filter((event) => event.status === "live");
  if (live.length === 0) return "setup";
  return live.length === draw.events.length && live.every(isFinished) ? "done" : "live";
}
