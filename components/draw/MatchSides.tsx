import type { ReactNode } from "react";
import type { Side } from "@/lib/draw/play";

// 경기의 두 참가자를 한 줄로 "김수미 · 이도임  3 vs 2  정경리 · Hanna Kim" 처럼 보여 줍니다.
// 게임 수와 "vs" 를 늘 줄 가운데에 두어, 여러 경기를 늘어놓아도 "vs" 가 한 세로줄에 맞습니다.
// 이름이 길면 팀마다 제 칸 안에서 줄을 바꿉니다.
// 경기 목록(DrawBoard), 칠 경기 고르기(TablePicker), 점수 입력 창(ScoreDialog)이 함께 씁니다.

export type MatchSide = {
  name: string;
  /** 참가자가 정해졌는지. 아니면 name 은 "A조 1위" 같은 자리 이름입니다. */
  decided: boolean;
  /** "vs" 옆에 적는 게임 수. 두 쪽 모두 비어 있으면 칸을 두지 않습니다. */
  score?: ReactNode;
};

const SIZES = {
  /** 테이블 현황 카드처럼 좁은 칸 */
  compact: { line: "max-w-md gap-x-2", name: "text-sm", score: "min-w-3 text-sm" },
  /** 넓은 화면에서 이름이 너무 벌어지지 않게 줄 너비를 묶어 둡니다. */
  normal: { line: "max-w-md gap-x-2.5", name: "text-[15px]", score: "min-w-4" },
  /** 점수 입력 창의 점수판. 줄 전체를 상자로 묶습니다.
   *  375px 휴대폰에서도 복식 이름("안희경 · 배석규")과 게임 수 입력 칸이 한 줄에 들어가게 여백을 줄였습니다. */
  board: { line: "gap-x-2 rounded-xl border border-slate-200 px-2.5 py-4", name: "text-[15px]", score: "min-w-7 text-2xl" },
};

const hasScore = (side: MatchSide) => side.score !== undefined && side.score !== "";

export function MatchSides({
  sides,
  winner,
  versus,
  size = "normal",
}: {
  sides: [MatchSide, MatchSide];
  winner?: Side;
  versus: string;
  size?: keyof typeof SIZES;
}) {
  const style = SIZES[size];
  const scored = sides.some(hasScore);

  const name = (side: MatchSide, key: Side) => (
    <span
      className={`break-keep ${style.name} ${key === "a" ? "text-right" : ""} ${
        !side.decided
          ? "text-slate-400 italic"
          : winner === key
            ? "font-black text-brand-950"
            : winner
              ? "text-slate-500"
              : "font-semibold text-slate-800"
      }`}
    >
      {side.name}
    </span>
  );
  const score = (side: MatchSide, key: Side) => (
    <span
      className={`text-center font-black tabular-nums ${style.score} ${
        winner === key ? "text-brand-800" : winner ? "text-slate-400" : "text-slate-700"
      }`}
    >
      {side.score}
    </span>
  );

  return (
    <span className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ${style.line}`}>
      {name(sides[0], "a")}
      <span className="flex items-center gap-1.5">
        {scored && score(sides[0], "a")}
        <span className="text-[11px] leading-4 font-black text-slate-400">{versus}</span>
        {scored && score(sides[1], "b")}
      </span>
      {name(sides[1], "b")}
    </span>
  );
}
