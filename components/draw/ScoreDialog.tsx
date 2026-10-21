"use client";

import { useId, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { ChevronDownIcon } from "@/components/icons";
import { setDrawTableAction, submitDrawScoreAction } from "@/lib/actions";
import {
  gamesToWin,
  isValidGame,
  matchBestOf,
  occupantKey,
  resultKey,
  setsFromPoints,
  tableChoices,
  type EventContext,
  type ScoreInput,
  type Side,
  type TableBoard,
} from "@/lib/draw/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Draw, DrawEvent, DrawMatch } from "@/lib/types";
import { Dialog } from "./Dialog";
import { eventName, matchLabel, matchup, pointsText, sideName } from "./labels";
import { MatchSides, type MatchSide } from "./MatchSides";

type Mode = "points" | "sets" | "walkover";

type Props = {
  tournamentId: string;
  lang: Locale;
  event: DrawEvent;
  /** 화면이 새로 받아 온 최신 경기 */
  match: DrawMatch;
  context: EventContext;
  /** 방문자가 점수를 입력할 수 있는 때인지 */
  scoring: boolean;
  /** 관리자 화면에서 열었으면 결과 지우기를 보여 주고, 테이블은 제한 없이 고릅니다. */
  admin: boolean;
  /** 화면이 그리는 대진표와 테이블 현황 (테이블 칸에서 고를 수 있는 테이블을 계산합니다) */
  draw: Draw;
  board: TableBoard;
  contexts: EventContext[];
  /**
   * 목록에서 b 쪽 팀을 왼쪽에 두고 보던 경기면 창도 b 쪽을 왼쪽에 그립니다. (우리 팀 점수를 늘 왼쪽 칸에 적게)
   * 입력값은 그대로 a, b 순서로 들고 있다가 저장합니다.
   */
  flip?: boolean;
  onSaved: (draw: Draw) => void;
  /** 다른 사람이 먼저 입력해 거절되었을 때 화면을 바로 새로 받아 오게 합니다. */
  onConflict: () => void;
  onClose: () => void;
};

const emptyRows = (count: number) => Array.from({ length: count }, () => ["", ""]);

/**
 * 게임 세트 두 칸을 읽습니다. 빈 칸은 0 이고, 한쪽이 이길 게임 수를 채워야 끝난 결과입니다.
 * 승부가 난 뒤에 마저 친 게임까지 합쳐 bestOf 게임까지 적을 수 있습니다. (3세트 2선승을 끝까지 쳐서 3:0)
 */
function readSets(inputs: [string, string], need: number, bestOf: number): [number, number] | null {
  const sets: [number, number] = [Number(inputs[0]), Number(inputs[1])];
  return Math.max(...sets) >= need && sets[0] + sets[1] <= bestOf ? sets : null;
}

/** 게임별 점수: 위에서부터 빈 줄 전까지 읽습니다. 규칙에 맞지 않는 줄이 있으면 그 줄에서 멈추고 badRow 로 알려 줍니다. */
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

/** 경기 한 판의 점수 입력 창. 게임별 점수, 게임 세트, 기권 가운데 골라 적습니다. */
export function ScoreDialog({
  tournamentId,
  lang,
  event,
  match,
  context,
  scoring,
  admin,
  draw,
  board,
  contexts,
  flip = false,
  onSaved,
  onConflict,
  onClose,
}: Props) {
  const t = getDictionary(lang).draw;
  /** 화면에 그리는 순서. 왼쪽 칸(0)부터 */
  const order: [Side, Side] = flip ? ["b", "a"] : ["a", "b"];
  /** 화면 칸 → a(0) · b(1) 자리 */
  const sideAt = (col: number) => (flip ? 1 - col : col);
  // 본선 방식을 따로 정한 종목은 경기마다 방식이 다릅니다.
  const bestOf = matchBestOf(event, match);
  const need = gamesToWin(bestOf);
  const state = context.stateOf(match);
  const canEdit = (scoring || admin) && state !== "pending" && state !== "bye";

  const [mode, setMode] = useState<Mode>(
    match.walkover ? "walkover" : match.sets && !match.points ? "sets" : "points",
  );
  const [rows, setRows] = useState<string[][]>(() => {
    const rows = emptyRows(bestOf);
    (match.points ?? []).forEach(([a, b], i) => (rows[i] = [String(a), String(b)]));
    return rows;
  });
  // 게임 세트: 점수판의 게임 수 자리에 양쪽이 딴 게임 수를 바로 적습니다. (3:1 이면 3 과 1)
  const [setInputs, setSetInputs] = useState<[string, string]>(() =>
    match.sets && !match.points ? [String(match.sets[0]), String(match.sets[1])] : ["", ""],
  );
  const setsRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sets = readSets(setInputs, need, bestOf);
  const [withdrawn, setWithdrawn] = useState<Side | null>(
    match.walkover ? (match.walkover === "a" ? "b" : "a") : null,
  );
  // 창을 열 때 본 결과. 그 사이 다른 사람이 바꿨으면 저장을 거절합니다.
  // 거절된 뒤에는 화면에 새로 보이는 결과를 기준으로 삼습니다.
  const [base, setBase] = useState<string | null>(() => resultKey(match));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tableError, setTableError] = useState<string | null>(null);
  /** 제목의 테이블 표시를 눌러 옮길 테이블을 고르는 중인지 */
  const [moving, setMoving] = useState(false);
  const moveId = useId();

  const a = sideName(match, "a", context, t);
  const b = sideName(match, "b", context, t);
  const named = { a, b };

  const { games, badRow } = readGames(rows);
  const pointSets = setsFromPoints(games);
  /** 세트별 점수 칸. 화면 순서로 (1세트 왼쪽, 1세트 오른쪽, 2세트 왼쪽 …) */
  const cellRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 세트별 점수 칸: 점수를 다 적으면 다음 칸으로 넘어갑니다. (1세트 왼쪽 → 오른쪽 → 2세트 왼쪽 …)
  // 1 은 10점대의 앞자리일 수 있어 둘째 자리를 기다립니다. 맞지 않는 세트는 고치도록 그 칸에 머물고,
  // 그 세트로 승부가 났거나 마지막 세트면 키보드를 닫아 저장 버튼이 보이게 합니다. (마저 친 세트는 그 칸을 눌러 적습니다)
  function typePoint(i: number, col: number, input: HTMLInputElement) {
    const value = input.value.replace(/\D/g, "").slice(0, 2);
    const side = sideAt(col);
    const next = rows.map((r, k) => (k === i ? (side === 0 ? [value, r[1]] : [r[0], value]) : r));
    // 다음 세트 칸이 열린 뒤에 옮겨 가도록 바로 그립니다.
    flushSync(() => setRows(next));
    setError(null);
    if (value === "" || value === "1") return;
    if (col === 0) return cellRefs.current[i * 2 + 1]?.focus();
    const read = readGames(next);
    if (read.games.length <= i) return;
    const [x, y] = setsFromPoints(read.games.slice(0, i + 1));
    const following = cellRefs.current[(i + 1) * 2];
    if (x >= need || y >= need || !following) input.blur();
    else following.focus();
  }

  const shown =
    mode === "points"
      ? pointSets
      : mode === "sets"
        ? ([Number(setInputs[0]), Number(setInputs[1])] as [number, number])
        : null;
  const shownWinner: Side | undefined = shown
    ? shown[0] >= need && shown[1] < need
      ? "a"
      : shown[1] >= need && shown[0] < need
        ? "b"
        : undefined
    : withdrawn
      ? withdrawn === "a"
        ? "b"
        : "a"
      : undefined;

  function submit(input: ScoreInput) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitDrawScoreAction(tournamentId, {
          event: event.id,
          match: match.id,
          previous: base ?? resultKey(match),
          input,
        });
        if ("error" in result) {
          setError(t.errors[result.error]);
          if (result.error === "conflict") {
            setBase(null);
            onConflict();
          }
          return;
        }
        onSaved(result.draw);
        onClose();
      } catch {
        setError(t.errors.network);
      }
    });
  }

  function save() {
    if (mode === "points") {
      if (badRow >= 0 || games.length === 0) return setError(t.errors.points);
      submit({ kind: "points", points: games });
    } else if (mode === "sets") {
      if (!sets) return setError(t.score.setsInvalid(need, bestOf));
      submit({ kind: "sets", sets });
    } else {
      if (!withdrawn) return setError(t.errors.sets);
      submit({ kind: "walkover", winner: withdrawn === "a" ? "b" : "a" });
    }
  }

  // 경기 중인 테이블 (시작을 누르지 않고 점수만 넣은 예선 경기는 그 조의 테이블)
  const shownTable = state === "playing" ? board.tableOf(match) : undefined;
  const showTables = canEdit && state !== "done" && draw.tables > 0;
  const choices = showTables ? tableChoices(draw, board, event, match, admin, contexts) : null;
  // 경기 중인 경기는 제목의 테이블 표시를 눌러 다른 빈 테이블로 옮깁니다. (조 테이블로 돌아가기 포함)
  const moveChoices =
    shownTable && choices
      ? [...(choices.home ? [choices.home.table] : []), ...choices.free].filter((n) => n !== shownTable)
      : null;
  // 조 테이블에 올리면 대기로 돌아갈 경기 (시작만 누르고 점수가 없는 경기)
  const replaced = choices?.home && choices.home.table !== shownTable ? choices.home.replaces : undefined;

  // 테이블에 올리기(시작)·옮기기. 시작하면 창을 닫고, 옮기면 적던 점수가 남도록 창을 그대로 둡니다.
  function place(table: number) {
    setTableError(null);
    startTransition(async () => {
      try {
        const result = await setDrawTableAction(tournamentId, {
          event: event.id,
          match: match.id,
          table,
          occupant: occupantKey(board.tables[table - 1]),
        });
        if ("error" in result) {
          setTableError(t.errors[result.error]);
          if (result.error === "tableTaken") onConflict();
          return;
        }
        onSaved(result.draw);
        if (shownTable) setMoving(false);
        else onClose();
      } catch {
        setTableError(t.errors.network);
      }
    });
  }

  const replacedNote = replaced && (
    <p className="mt-2 text-xs break-keep text-slate-500">
      {t.start.replaces(matchup(replaced.match, contexts[draw.events.indexOf(replaced.event)], t))}
    </p>
  );
  const tableErrorNote = tableError && (
    <p role="alert" className="mt-2 text-sm font-semibold break-keep text-accent-700">
      {tableError}
    </p>
  );
  const tableBadge =
    "ml-2 rounded-full bg-accent-50 px-2.5 py-0.5 align-middle text-xs font-bold text-accent-700 ring-1 ring-accent-200";
  const tableButton = (table: number) => (
    <button
      key={table}
      type="button"
      disabled={pending}
      onClick={() => place(table)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-60"
    >
      {t.table(table)}
    </button>
  );

  // 게임 세트 칸: 한 칸에 숫자 하나. 왼쪽 칸을 적으면 오른쪽 칸으로 넘어가고,
  // 둘째 칸까지 맞게 적으면 키보드를 닫아 저장 버튼이 보이게 합니다.
  const setsField = (col: number, name: string) => (
    <input
      ref={(el) => {
        setsRefs.current[col] = el;
      }}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder="0"
      aria-label={`${name} ${t.score.total}`}
      value={setInputs[sideAt(col)]}
      onChange={(e) => {
        const i = sideAt(col);
        // 이미 적힌 칸에 새로 누르면 그 숫자로 바꿉니다.
        const digits = e.target.value.replace(/\D/g, "");
        const value = (digits.length > 1 ? digits.replace(setInputs[i], "") : digits).slice(-1);
        if (Number(value) > bestOf) return;
        const next: [string, string] = i === 0 ? [value, setInputs[1]] : [setInputs[0], value];
        setSetInputs(next);
        setError(null);
        if (value === "") return;
        if (col === 0) setsRefs.current[1]?.focus();
        else if (readSets(next, need, bestOf)) e.target.blur();
      }}
      className="w-8 rounded-lg border border-slate-300 bg-white py-0.5 text-center placeholder:text-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-hidden"
    />
  );
  const editingSets = canEdit && mode === "sets";

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        // 게임 세트를 고르면 점수판 첫 칸에 바로 적을 수 있게 합니다.
        flushSync(() => setMode(value));
        setError(null);
        if (value === "sets") setsRefs.current[0]?.focus();
      }}
      aria-pressed={mode === value}
      className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold transition-colors ${
        mode === value ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-brand-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Dialog
      eyebrow={`${eventName(event, lang)} · ${t.bestOf(bestOf)}`}
      title={
        <>
          {matchLabel(event, match, t)}
          {shownTable &&
            (moveChoices ? (
              <button
                type="button"
                onClick={() => {
                  setMoving((open) => !open);
                  setTableError(null);
                }}
                aria-expanded={moving}
                aria-controls={moveId}
                className={`${tableBadge} inline-flex items-center gap-0.5 pr-1.5 transition-colors hover:bg-accent-100`}
              >
                {t.table(shownTable)}
                <ChevronDownIcon className={`size-3.5 transition-transform ${moving ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <span className={tableBadge}>{t.table(shownTable)}</span>
            ))}
        </>
      }
      closeLabel={t.score.close}
      onClose={onClose}
      footer={
        canEdit && (
          <>
            {error && (
              <p role="alert" className="mb-3 rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
                {error}
              </p>
            )}
            <button type="button" onClick={save} disabled={pending} className="btn btn-brand w-full">
              {pending ? t.score.saving : t.score.save}
            </button>
          </>
        )
      }
    >
      {/* 테이블 옮기기: 제목의 테이블 표시를 누르면 열립니다. */}
      {moving && moveChoices && (
        <section
          id={moveId}
          aria-label={t.start.moveTo}
          className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
        >
          {moveChoices.length > 0 ? (
            <>
              <p className="text-xs font-bold text-slate-500">{t.start.moveTo}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{moveChoices.map(tableButton)}</div>
              {replacedNote}
            </>
          ) : (
            <p className="text-sm break-keep text-slate-600">{t.start.moveNone}</p>
          )}
          {tableErrorNote}
        </section>
      )}

      {/* 점수판: 두 참가자와 지금(또는 입력 중인) 게임 수를 한 줄로 "A  3 vs 2  B". 이기는 쪽 이름과 게임 수가 바로 파랗게 바뀝니다.
          게임 세트로 적을 때는 게임 수 자리가 입력 칸이 됩니다. */}
      <div className="mt-4">
        <MatchSides
          sides={
            order.map((side, col) => ({
              name: named[side].name,
              decided: Boolean(named[side].entry),
              score: editingSets
                ? setsField(col, named[side].name)
                : shown
                  ? shown[sideAt(col)]
                  : withdrawn === side
                    ? "–"
                    : "",
            })) as [MatchSide, MatchSide]
          }
          // MatchSides 의 a 는 왼쪽에 그린 쪽입니다.
          winner={shownWinner && (shownWinner === order[0] ? "a" : "b")}
          versus={t.versus}
          size="board"
        />
      </div>
      {match.points && match.points.length > 0 && mode !== "points" && (
        <p className="mt-2 text-sm text-slate-500">{pointsText(match, flip)}</p>
      )}

      {/* 테이블: 아직 테이블에 없는 경기를 어느 테이블에서 칠지. 시작을 누르면 모두의 화면에 경기 중으로 보입니다.
          테이블에 있는 경기는 제목의 테이블 표시로 옮깁니다. */}
      {choices && !shownTable && (
        <section aria-label={t.start.title} className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          {choices.home ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => place(choices.home!.table)}
                className="btn btn-brand w-full"
              >
                {t.start.at(t.table(choices.home.table))}
              </button>
              {replacedNote}
            </>
          ) : (
            choices.free.length === 0 && (
              <p className="text-sm break-keep text-slate-600">
                {choices.blocked ? t.start[choices.blocked] : t.start.none}
              </p>
            )
          )}
          {choices.free.length > 0 && (
            <div className={choices.home ? "mt-3" : ""}>
              <p className="text-xs font-bold text-slate-500">
                {choices.home ? t.start.otherTables : t.start.freeTables}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{choices.free.map(tableButton)}</div>
            </div>
          )}
          {(choices.home || choices.free.length > 0) && (
            <p className="mt-2 text-xs break-keep text-slate-500">{t.start.hint}</p>
          )}
          {tableErrorNote}
        </section>
      )}

      {!canEdit ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm break-keep text-slate-600">
          {state === "pending" ? t.errors.notReady : t.scoringClosed}
        </p>
      ) : (
        <>
          <div className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1">
            {tab("points", t.score.modePoints)}
            {tab("sets", t.score.modeSets)}
            {tab("walkover", t.score.modeWalkover)}
          </div>

          {mode === "points" && (
            <div className="mt-4">
              <div className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2 text-xs font-bold text-slate-500">
                <span />
                {order.map((side) => (
                  <span key={side} className="truncate text-center" title={named[side].name}>
                    {named[side].name}
                  </span>
                ))}
              </div>
              {rows.map((row, i) => {
                // 위 세트부터 차례로 적습니다. 승부가 난 뒤에도 남은 세트를 마저 친 점수를 적을 수 있습니다.
                const locked = i > games.length;
                return (
                  <div key={i} className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">{t.score.game(i + 1)}</span>
                    {order.map((side, col) => (
                      <input
                        key={side}
                        ref={(el) => {
                          cellRefs.current[i * 2 + col] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        disabled={locked && row[0] === "" && row[1] === ""}
                        aria-label={`${t.score.game(i + 1)} ${named[side].name}`}
                        value={row[sideAt(col)]}
                        // 이미 적힌 칸에 들어오면 전체를 골라 두어, 새로 누르는 숫자로 바로 바뀝니다.
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
              <p className="hint break-keep">{t.score.pointsHint}</p>
            </div>
          )}

          {mode === "sets" && <p className="hint mt-3 break-keep">{t.score.setsHint}</p>}

          {mode === "walkover" && (
            <div className="mt-4 space-y-2">
              {order.map((side) => {
                const active = withdrawn === side;
                return (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setWithdrawn(side)}
                    aria-pressed={active}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left font-bold break-keep transition-colors ${
                      active
                        ? "border-accent-600 bg-accent-50 text-accent-700"
                        : "border-slate-200 text-slate-700 hover:border-accent-200"
                    }`}
                  >
                    {t.score.withdrew(named[side].name)}
                  </button>
                );
              })}
              <p className="hint break-keep">{t.score.walkoverHint}</p>
            </div>
          )}
        </>
      )}

      {admin && (match.sets || match.walkover || (!canEdit && error)) && (
        <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
          <p className="text-sm font-black text-brand-950">관리자</p>
          {(match.sets || match.walkover) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("이 경기의 결과를 지울까요?")) submit({ kind: "clear" });
              }}
              className="btn btn-ghost btn-sm w-full text-accent-700"
            >
              결과 지우기
            </button>
          )}
          {!canEdit && error && (
            <p role="alert" className="text-sm font-semibold text-accent-700">{error}</p>
          )}
        </div>
      )}
    </Dialog>
  );
}
