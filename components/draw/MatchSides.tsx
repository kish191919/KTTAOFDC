import { Fragment, type ReactNode } from "react";
import type { Side } from "@/lib/draw/play";

// 경기의 두 참가자. 팀마다 상자로 묶고 상자 사이에 "vs" 를 넣어 누가 누구와 붙는지 한눈에 보이게 합니다.
// 경기 목록(DrawBoard)과 점수 입력 창(ScoreDialog)이 함께 씁니다.
// row 면 두 상자를 한 줄에 나란히 놓습니다. (테이블 카드의 남은 경기처럼 여러 경기를 짧게 늘어놓을 때)

export type MatchSide = {
  name: string;
  /** 참가자가 정해졌는지. 아니면 name 은 "A조 1위" 같은 자리 이름입니다. */
  decided: boolean;
  /** 오른쪽에 적는 게임 수. 비어 있으면 칸을 두지 않습니다. */
  score?: ReactNode;
};

const SIZES = {
  /** 테이블 현황 카드처럼 좁은 칸 */
  compact: { box: "px-2.5 py-1.5", name: "text-sm", score: "min-w-4 text-sm", vs: "pl-2.5" },
  normal: { box: "px-3 py-2", name: "text-[15px]", score: "min-w-5", vs: "pl-3" },
  /** 점수 입력 창의 점수판 */
  board: { box: "px-4 py-3", name: "", score: "min-w-8 text-2xl", vs: "pl-4" },
};

export function MatchSides({
  sides,
  winner,
  versus,
  size = "normal",
  row = false,
}: {
  sides: [MatchSide, MatchSide];
  winner?: Side;
  versus: string;
  size?: keyof typeof SIZES;
  row?: boolean;
}) {
  const style = SIZES[size];
  return (
    <span className={row ? "flex items-center gap-1.5" : "block"}>
      {sides.map((side, i) => {
        const key: Side = i === 0 ? "a" : "b";
        const won = winner === key;
        return (
          <Fragment key={key}>
            {i === 1 && (
              <span
                className={`text-[11px] leading-4 font-black text-slate-400 ${row ? "shrink-0" : `block py-0.5 ${style.vs}`}`}
              >
                {versus}
              </span>
            )}
            <span
              className={`flex items-center gap-2 rounded-lg border ${row ? "min-w-0 flex-1 self-stretch" : ""} ${style.box} ${
                !side.decided
                  ? "border-dashed border-slate-200 bg-slate-50/60"
                  : won
                    ? "border-brand-200 bg-brand-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <span
                className={`min-w-0 flex-1 break-keep ${style.name} ${
                  !side.decided
                    ? "text-slate-400 italic"
                    : won
                      ? "font-black text-brand-950"
                      : winner
                        ? "text-slate-500"
                        : "font-semibold text-slate-800"
                }`}
              >
                {side.name}
              </span>
              {side.score !== undefined && side.score !== "" && (
                <span
                  className={`shrink-0 text-right font-black tabular-nums ${style.score} ${
                    won ? "text-brand-800" : winner ? "text-slate-400" : "text-slate-700"
                  }`}
                >
                  {side.score}
                </span>
              )}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}
