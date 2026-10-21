"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { gamesToWin, isValidGame, setsFromPoints, type ScoreInput } from "@/lib/draw/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { GameMatch } from "@/lib/types";
import { MatchSides, type MatchSide } from "@/components/draw/MatchSides";

// 번개 게임의 결과 입력: 세트 스코어 단추(3:0 · 3:1 · 3:2) 한 번, 또는 세트별 점수, 또는 기권.
// 경기 결과 창과 경기 기록 창이 함께 씁니다. 입력값은 화면 순서(왼쪽 0 · 오른쪽 1)로 들고 있다가
// 저장할 때 readResult 로 경기의 a · b 순서로 바꿉니다.

export type ResultMode = "quick" | "points" | "walkover";

export type ResultValue = {
  mode: ResultMode;
  /** 세트 스코어 [왼쪽, 오른쪽] */
  quick: [number, number] | null;
  /** 세트별 점수 칸 [왼쪽, 오른쪽] */
  rows: string[][];
  /** 기권한 쪽 */
  withdrawn: 0 | 1 | null;
};

type Result = Pick<GameMatch, "sets" | "points" | "walkover">;

const ordered = <T,>(pair: [T, T], flip: boolean): [T, T] => (flip ? [pair[1], pair[0]] : pair);

/** 경기에 적힌 결과로 입력을 시작합니다. flip 이면 b 쪽을 왼쪽에 그립니다. */
export function startResult(match: Result | undefined, bestOf: number, flip = false): ResultValue {
  const rows = Array.from({ length: bestOf }, () => ["", ""]);
  (match?.points ?? []).forEach((game, i) => {
    rows[i] = ordered(game, flip).map(String);
  });
  const walkover = match?.walkover;
  return {
    mode: walkover ? "walkover" : match?.points ? "points" : "quick",
    quick: match?.sets && !match.points ? ordered(match.sets, flip) : null,
    rows,
    // 이긴 쪽의 맞은편이 기권한 쪽입니다.
    withdrawn: walkover ? ((walkover === "a") !== flip ? 1 : 0) : null,
  };
}

/** 세트별 점수: 위에서부터 빈 줄 전까지 읽습니다. 규칙에 맞지 않는 줄이 있으면 그 줄에서 멈추고 badRow 로 알려 줍니다. */
function readGames(rows: string[][]): { games: [number, number][]; badRow: number } {
  const games: [number, number][] = [];
  for (let i = 0; i < rows.length; i++) {
    const [x, y] = rows[i];
    if (x === "" && y === "") break;
    const game: [number, number] = [Number(x), Number(y)];
    if (x === "" || y === "" || !isValidGame(game)) return { games, badRow: i };
    games.push(game);
  }
  return { games, badRow: -1 };
}

/** 저장할 결과 (경기의 a · b 순서). 아무것도 고르지 않았으면 null, 맞지 않으면 오류 이름입니다. */
export function readResult(value: ResultValue, flip = false): ScoreInput | null | "points" {
  if (value.mode === "quick") return value.quick ? { kind: "sets", sets: ordered(value.quick, flip) } : null;
  if (value.mode === "walkover") {
    if (value.withdrawn === null) return null;
    const winnerAt = value.withdrawn === 0 ? 1 : 0;
    return { kind: "walkover", winner: (winnerAt === 0) !== flip ? "a" : "b" };
  }
  const { games, badRow } = readGames(value.rows);
  if (badRow >= 0) return "points";
  if (games.length === 0) return null;
  return { kind: "points", points: games.map((game) => ordered(game, flip)) };
}

export function ResultInput({
  lang,
  names,
  bestOf,
  value,
  onChange,
  walkover = false,
}: {
  lang: Locale;
  /** [왼쪽, 오른쪽] 이름 */
  names: [string, string];
  bestOf: number;
  value: ResultValue;
  onChange: (value: ResultValue) => void;
  /** 기권 입력을 보여 줄지 (리그전) */
  walkover?: boolean;
}) {
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const need = gamesToWin(bestOf);
  const { games, badRow } = readGames(value.rows);
  /** 점수판에 보이는 세트 스코어 */
  const shown =
    value.mode === "quick" ? value.quick : value.mode === "points" && games.length > 0 ? setsFromPoints(games) : null;
  const winner = shown
    ? shown[0] >= need
      ? "a"
      : shown[1] >= need
        ? "b"
        : undefined
    : value.mode === "walkover" && value.withdrawn !== null
      ? value.withdrawn === 0
        ? "b"
        : "a"
      : undefined;
  /** 세트별 점수 칸. 화면 순서로 (1세트 왼쪽, 1세트 오른쪽, 2세트 왼쪽 …) */
  const cells = useRef<(HTMLInputElement | null)[]>([]);

  // 세트별 점수 칸: 점수를 다 적으면 다음 칸으로 넘어갑니다. (components/draw/ScoreDialog.tsx 와 같은 방식)
  // 1 은 10점대의 앞자리일 수 있어 둘째 자리를 기다리고, 승부가 났거나 마지막 세트면 키보드를 닫아 저장 버튼이 보이게 합니다.
  function typePoint(i: number, col: number, input: HTMLInputElement) {
    const digits = input.value.replace(/\D/g, "").slice(0, 2);
    const rows = value.rows.map((r, k) => (k === i ? (col === 0 ? [digits, r[1]] : [r[0], digits]) : r));
    flushSync(() => onChange({ ...value, rows }));
    if (digits === "" || digits === "1") return;
    if (col === 0) return cells.current[i * 2 + 1]?.focus();
    const read = readGames(rows);
    if (read.games.length <= i) return;
    const [x, y] = setsFromPoints(read.games.slice(0, i + 1));
    const following = cells.current[(i + 1) * 2];
    if (x >= need || y >= need || !following) input.blur();
    else following.focus();
  }

  const tab = (mode: ResultMode, label: string) => (
    <button
      type="button"
      onClick={() => onChange({ ...value, mode })}
      aria-pressed={value.mode === mode}
      className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold transition-colors ${
        value.mode === mode ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-brand-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      {/* 점수판 "A  3 vs 1  B". 이기는 쪽 이름과 세트 수가 바로 파랗게 바뀝니다. */}
      <div className="mt-4">
        <MatchSides
          sides={
            [0, 1].map((col) => ({
              name: names[col],
              decided: true,
              score: shown ? shown[col] : value.mode === "walkover" && value.withdrawn === col ? "–" : "",
            })) as [MatchSide, MatchSide]
          }
          winner={winner}
          versus={d.versus}
          size="board"
        />
      </div>

      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {tab("quick", t.modeQuick)}
        {tab("points", t.modePoints)}
        {walkover && tab("walkover", t.modeWalkover)}
      </div>

      {value.mode === "quick" && (
        <div className="mt-4 space-y-3">
          {[0, 1].map((col) => (
            <div key={col}>
              <p className="truncate text-xs font-bold text-slate-500">{t.won(names[col])}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {Array.from({ length: need }, (_, lost) => {
                  const pair: [number, number] = col === 0 ? [need, lost] : [lost, need];
                  const active = value.quick?.[0] === pair[0] && value.quick?.[1] === pair[1];
                  return (
                    <button
                      key={lost}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange({ ...value, quick: pair })}
                      className={`rounded-xl border-2 py-2.5 text-lg font-black tabular-nums transition-colors ${
                        active
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      {need}:{lost}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="hint break-keep">{t.quickHint}</p>
        </div>
      )}

      {value.mode === "points" && (
        <div className="mt-4">
          <div className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2 text-xs font-bold text-slate-500">
            <span />
            {names.map((name, col) => (
              <span key={col} className="truncate text-center" title={name}>
                {name}
              </span>
            ))}
          </div>
          {value.rows.map((row, i) => {
            // 위 세트부터 차례로 적습니다. 승부가 난 뒤에도 남은 세트를 마저 친 점수를 적을 수 있습니다.
            const locked = i > games.length;
            return (
              <div key={i} className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
                <span className="text-sm font-semibold text-slate-600">{d.score.game(i + 1)}</span>
                {[0, 1].map((col) => (
                  <input
                    key={col}
                    ref={(el) => {
                      cells.current[i * 2 + col] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    disabled={locked && row[0] === "" && row[1] === ""}
                    aria-label={`${d.score.game(i + 1)} ${names[col]}`}
                    value={row[col]}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => typePoint(i, col, e.target)}
                    className={`field py-2 text-center text-lg font-bold tabular-nums ${
                      badRow === i ? "border-accent-400 ring-2 ring-accent-100" : ""
                    }`}
                  />
                ))}
              </div>
            );
          })}
          <p className="hint break-keep">{d.score.pointsHint}</p>
        </div>
      )}

      {value.mode === "walkover" && (
        <div className="mt-4 space-y-2">
          {[0, 1].map((col) => {
            const active = value.withdrawn === col;
            return (
              <button
                key={col}
                type="button"
                onClick={() => onChange({ ...value, withdrawn: col as 0 | 1 })}
                aria-pressed={active}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left font-bold break-keep transition-colors ${
                  active
                    ? "border-accent-600 bg-accent-50 text-accent-700"
                    : "border-slate-200 text-slate-700 hover:border-accent-200"
                }`}
              >
                {d.score.withdrew(names[col])}
              </button>
            );
          })}
          <p className="hint break-keep">{d.score.walkoverHint}</p>
        </div>
      )}
    </>
  );
}
