"use client";

import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { setDrawTableAction, submitDrawScoreAction } from "@/lib/actions";
import {
  gamesToWin,
  isValidGame,
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
  onSaved: (draw: Draw) => void;
  /** 다른 사람이 먼저 입력해 거절되었을 때 화면을 바로 새로 받아 오게 합니다. */
  onConflict: () => void;
  onClose: () => void;
};

const emptyRows = (count: number) => Array.from({ length: count }, () => ["", ""]);

/** 게임 세트 두 칸을 읽습니다. 빈 칸은 0 이고, 한쪽이 이길 게임 수를 채워야 끝난 결과입니다. */
function readSets(inputs: [string, string], need: number): [number, number] | null {
  const sets: [number, number] = [Number(inputs[0]), Number(inputs[1])];
  return Math.max(...sets) === need && Math.min(...sets) < need ? sets : null;
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
  onSaved,
  onConflict,
  onClose,
}: Props) {
  const t = getDictionary(lang).draw;
  const need = gamesToWin(event.bestOf);
  const state = context.stateOf(match);
  const canEdit = (scoring || admin) && state !== "pending" && state !== "bye";

  const [mode, setMode] = useState<Mode>(
    match.walkover ? "walkover" : match.sets && !match.points ? "sets" : "points",
  );
  const [rows, setRows] = useState<string[][]>(() => {
    const rows = emptyRows(event.bestOf);
    (match.points ?? []).forEach(([a, b], i) => (rows[i] = [String(a), String(b)]));
    return rows;
  });
  // 게임 세트: 점수판의 게임 수 자리에 양쪽이 딴 게임 수를 바로 적습니다. (3:1 이면 3 과 1)
  const [setInputs, setSetInputs] = useState<[string, string]>(() =>
    match.sets && !match.points ? [String(match.sets[0]), String(match.sets[1])] : ["", ""],
  );
  const setsRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sets = readSets(setInputs, need);
  const [withdrawn, setWithdrawn] = useState<Side | null>(
    match.walkover ? (match.walkover === "a" ? "b" : "a") : null,
  );
  // 창을 열 때 본 결과. 그 사이 다른 사람이 바꿨으면 저장을 거절합니다.
  // 거절된 뒤에는 화면에 새로 보이는 결과를 기준으로 삼습니다.
  const [base, setBase] = useState<string | null>(() => resultKey(match));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tableError, setTableError] = useState<string | null>(null);

  const a = sideName(match, "a", context, t);
  const b = sideName(match, "b", context, t);

  // 게임별 점수: 위에서부터 빈 줄 전까지 읽습니다.
  const games: [number, number][] = [];
  let badRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const [x, y] = rows[i];
    if (x === "" && y === "") break;
    const game: [number, number] = [Number(x), Number(y)];
    if (x === "" || y === "" || !isValidGame(game)) {
      badRow = i;
      break;
    }
    games.push(game);
  }
  const pointSets = setsFromPoints(games, event.bestOf) ?? [0, 0];
  const decided = pointSets[0] >= need || pointSets[1] >= need;

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
      if (!sets) return setError(t.score.setsInvalid(need));
      submit({ kind: "sets", sets });
    } else {
      if (!withdrawn) return setError(t.errors.sets);
      submit({ kind: "walkover", winner: withdrawn === "a" ? "b" : "a" });
    }
  }

  // 테이블에 올리기(시작)·옮기기·내리기. table 이 null 이면 내립니다.
  function place(table: number | null) {
    setTableError(null);
    startTransition(async () => {
      try {
        const result = await setDrawTableAction(tournamentId, {
          event: event.id,
          match: match.id,
          table,
          occupant: table === null ? "" : occupantKey(board.tables[table - 1]),
        });
        if ("error" in result) {
          setTableError(t.errors[result.error]);
          if (result.error === "tableTaken") onConflict();
          return;
        }
        onSaved(result.draw);
        onClose();
      } catch {
        setTableError(t.errors.network);
      }
    });
  }

  // 경기 중인 테이블 (시작을 누르지 않고 점수만 넣은 예선 경기는 그 조의 테이블)
  const shownTable = state === "playing" ? board.tableOf(match) : undefined;
  const showTables = canEdit && state !== "done" && draw.tables > 0;
  const choices = showTables ? tableChoices(draw, board, event, match, admin, contexts) : null;
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

  // 게임 세트 칸: 한 칸에 숫자 하나. 첫 칸을 적으면 둘째 칸으로 넘어가고,
  // 둘째 칸까지 맞게 적으면 키보드를 닫아 저장 버튼이 보이게 합니다.
  const setsField = (i: 0 | 1, name: string) => (
    <input
      ref={(el) => {
        setsRefs.current[i] = el;
      }}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder="0"
      aria-label={`${name} ${t.score.total}`}
      value={setInputs[i]}
      onChange={(e) => {
        // 이미 적힌 칸에 새로 누르면 그 숫자로 바꿉니다.
        const digits = e.target.value.replace(/\D/g, "");
        const value = (digits.length > 1 ? digits.replace(setInputs[i], "") : digits).slice(-1);
        if (Number(value) > need) return;
        const next: [string, string] = i === 0 ? [value, setInputs[1]] : [setInputs[0], value];
        setSetInputs(next);
        setError(null);
        if (value === "") return;
        if (i === 0) setsRefs.current[1]?.focus();
        else if (readSets(next, need)) e.target.blur();
      }}
      className="w-14 rounded-lg border border-slate-300 bg-white py-0.5 text-center placeholder:text-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-hidden"
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
      eyebrow={`${eventName(event, lang)} · ${t.bestOf(event.bestOf)}`}
      title={
        <>
          {matchLabel(event, match, t)}
          {shownTable && (
            <span className="ml-2 rounded-full bg-accent-50 px-2.5 py-0.5 align-middle text-xs font-bold text-accent-700 ring-1 ring-accent-200">
              {t.table(shownTable)}
            </span>
          )}
        </>
      }
      closeLabel={t.score.close}
      onClose={onClose}
    >
      {/* 점수판: 두 참가자와 지금(또는 입력 중인) 게임 수. 이기는 쪽 상자가 바로 파랗게 바뀝니다.
          게임 세트로 적을 때는 게임 수 자리가 입력 칸이 됩니다. */}
      <div className="mt-4">
        <MatchSides
          sides={
            [a, b].map((side, i) => ({
              name: side.name,
              decided: Boolean(side.entry),
              score: editingSets
                ? setsField(i as 0 | 1, side.name)
                : shown
                  ? shown[i]
                  : withdrawn === (i === 0 ? "a" : "b")
                    ? "–"
                    : "",
            })) as [MatchSide, MatchSide]
          }
          winner={shownWinner}
          versus={t.versus}
          size="board"
        />
      </div>
      {match.points && match.points.length > 0 && mode !== "points" && (
        <p className="mt-2 text-sm text-slate-500">{pointsText(match)}</p>
      )}

      {/* 테이블: 이 경기를 어느 테이블에서 치는지. 시작을 누르면 모두의 화면에 경기 중으로 보입니다. */}
      {choices && (
        <section aria-label={t.start.title} className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          {match.table ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-accent-700">{t.start.on(t.table(match.table))}</span>
              <button type="button" disabled={pending} onClick={() => place(null)} className="btn btn-ghost btn-sm">
                {t.start.leave}
              </button>
            </div>
          ) : choices.home ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => place(choices.home!.table)}
                className="btn btn-brand w-full"
              >
                {t.start.at(t.table(choices.home.table))}
              </button>
              {choices.home.replaces && (
                <p className="mt-2 text-xs break-keep text-slate-500">
                  {t.start.replaces(
                    matchup(choices.home.replaces.match, contexts[draw.events.indexOf(choices.home.replaces.event)], t),
                  )}
                </p>
              )}
            </>
          ) : (
            choices.free.length === 0 && (
              <p className="text-sm break-keep text-slate-600">
                {choices.blocked ? t.start[choices.blocked] : t.start.none}
              </p>
            )
          )}
          {choices.free.length > 0 && (!match.table || admin) && (
            <div className={match.table || choices.home ? "mt-3" : ""}>
              <p className="text-xs font-bold text-slate-500">
                {match.table ? t.start.moveTo : choices.home ? t.start.otherTables : t.start.freeTables}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{choices.free.map(tableButton)}</div>
            </div>
          )}
          {!match.table && (choices.home || choices.free.length > 0) && (
            <p className="mt-2 text-xs break-keep text-slate-500">{t.start.hint}</p>
          )}
          {tableError && (
            <p role="alert" className="mt-2 text-sm font-semibold break-keep text-accent-700">
              {tableError}
            </p>
          )}
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
                <span className="truncate text-center" title={a.name}>{a.name}</span>
                <span className="truncate text-center" title={b.name}>{b.name}</span>
              </div>
              {rows.map((row, i) => {
                const locked = i > games.length || (decided && i >= games.length);
                return (
                  <div key={i} className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">{t.score.game(i + 1)}</span>
                    {[0, 1].map((side) => (
                      <input
                        key={side}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        disabled={locked && row[0] === "" && row[1] === ""}
                        aria-label={`${t.score.game(i + 1)} ${side === 0 ? a.name : b.name}`}
                        value={row[side]}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 2);
                          setRows((current) =>
                            current.map((r, k) =>
                              k === i ? (side === 0 ? [value, r[1]] : [r[0], value]) : r,
                            ),
                          );
                        }}
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
              {(["a", "b"] as const).map((side) => {
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
                    {t.score.withdrew((side === "a" ? a : b).name)}
                  </button>
                );
              })}
              <p className="hint break-keep">{t.score.walkoverHint}</p>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="btn btn-brand mt-5 w-full"
          >
            {pending ? t.score.saving : t.score.save}
          </button>
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
