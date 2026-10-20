"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { drawAdminAction, submitDrawScoreAction } from "@/lib/actions";
import {
  gamesToWin,
  isValidGame,
  resultKey,
  setsFromPoints,
  winnerOf,
  type EventContext,
  type ScoreInput,
  type Side,
} from "@/lib/draw/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Draw, DrawEvent, DrawMatch } from "@/lib/types";
import { CloseIcon } from "@/components/icons";
import { eventName, matchLabel, pointsText, sideName } from "./labels";
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
  /** 관리자 화면에서 열었으면 결과 지우기와 테이블 옮기기를 함께 보여 줍니다. */
  admin: boolean;
  tables: number;
  onSaved: (draw: Draw) => void;
  /** 다른 사람이 먼저 입력해 거절되었을 때 화면을 바로 새로 받아 오게 합니다. */
  onConflict: () => void;
  onClose: () => void;
};

const emptyRows = (count: number) => Array.from({ length: count }, () => ["", ""]);

/** 경기 한 판의 점수 입력 창. 게임별 점수, 게임 세트, 기권 가운데 골라 적습니다. */
export function ScoreDialog({
  tournamentId,
  lang,
  event,
  match,
  context,
  scoring,
  admin,
  tables,
  onSaved,
  onConflict,
  onClose,
}: Props) {
  const t = getDictionary(lang).draw;
  const titleId = useId();
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
  // 게임 세트: 이긴 쪽을 먼저 고르고, 진 쪽이 딴 게임 수를 고릅니다. (3:0, 3:1, 3:2)
  const savedSets = match.sets && !match.points && winnerOf(match, event.bestOf) ? match.sets : null;
  const [winner, setWinner] = useState<Side | null>(
    savedSets ? (savedSets[0] > savedSets[1] ? "a" : "b") : null,
  );
  const [loserGames, setLoserGames] = useState<number | null>(
    savedSets ? Math.min(...savedSets) : null,
  );
  const sets: [number, number] | null =
    winner && loserGames !== null ? (winner === "a" ? [need, loserGames] : [loserGames, need]) : null;
  const [withdrawn, setWithdrawn] = useState<Side | null>(
    match.walkover ? (match.walkover === "a" ? "b" : "a") : null,
  );
  // 창을 열 때 본 결과. 그 사이 다른 사람이 바꿨으면 저장을 거절합니다.
  // 거절된 뒤에는 화면에 새로 보이는 결과를 기준으로 삼습니다.
  const [base, setBase] = useState<string | null>(() => resultKey(match));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tableChoice, setTableChoice] = useState<string>(
    match.table ? String(match.table) : match.hold ? "hold" : "queue",
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

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
        ? (sets ?? match.sets ?? [0, 0])
        : null;
  const shownWinner: Side | undefined = shown
    ? shown[0] >= need
      ? "a"
      : shown[1] >= need
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
      if (!sets) return setError(t.score.setsMissing);
      submit({ kind: "sets", sets });
    } else {
      if (!withdrawn) return setError(t.errors.sets);
      submit({ kind: "walkover", winner: withdrawn === "a" ? "b" : "a" });
    }
  }

  function moveTable() {
    setError(null);
    startTransition(async () => {
      const value = tableChoice === "queue" || tableChoice === "hold" ? tableChoice : Number(tableChoice);
      try {
        const result = await drawAdminAction(tournamentId, {
          op: "table",
          event: event.id,
          match: match.id,
          table: value,
        });
        if ("error" in result) return setError(result.error);
        onSaved(result.draw);
        onClose();
      } catch {
        setError(t.errors.network);
      }
    });
  }

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      aria-pressed={mode === value}
      className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold transition-colors ${
        mode === value ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-brand-700"
      }`}
    >
      {label}
    </button>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-accent-600">
              {eventName(event, lang)} · {t.bestOf(event.bestOf)}
            </p>
            <h2 id={titleId} className="mt-0.5 text-lg font-black text-brand-950">
              {matchLabel(event, match, t)}
              {match.table && state !== "done" && (
                <span className="ml-2 rounded-full bg-accent-50 px-2.5 py-0.5 align-middle text-xs font-bold text-accent-700 ring-1 ring-accent-200">
                  {t.table(match.table)}
                </span>
              )}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.score.close}
            className="-mt-1 -mr-1 rounded-full p-2 text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {/* 점수판: 두 참가자와 지금(또는 입력 중인) 게임 수. 이기는 쪽 상자가 바로 파랗게 바뀝니다. */}
        <div className="mt-4">
          <MatchSides
            sides={
              [a, b].map((side, i) => ({
                name: side.name,
                decided: Boolean(side.entry),
                score: shown ? shown[i] : withdrawn === (i === 0 ? "a" : "b") ? "–" : "",
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

            {mode === "sets" && (
              <div className="mt-4">
                <p className="text-sm font-bold text-slate-600">{t.score.setsWinner}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["a", "b"] as const).map((side) => {
                    const active = winner === side;
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => setWinner(side)}
                        aria-pressed={active}
                        className={`rounded-xl border-2 px-3 py-3 font-bold break-keep transition-colors ${
                          active
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-slate-200 text-slate-700 hover:border-brand-300"
                        }`}
                      >
                        {(side === "a" ? a : b).name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm font-bold text-slate-600">{t.score.setsScore}</p>
                <div className="mt-2 flex gap-2">
                  {Array.from({ length: need }, (_, lost) => {
                    const active = loserGames === lost;
                    return (
                      <button
                        key={lost}
                        type="button"
                        onClick={() => setLoserGames(lost)}
                        aria-pressed={active}
                        className={`flex-1 rounded-xl border-2 py-2.5 text-lg font-black tabular-nums transition-colors ${
                          active
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-slate-200 text-slate-700 hover:border-brand-300"
                        }`}
                      >
                        {need} : {lost}
                      </button>
                    );
                  })}
                </div>
                <p className="hint break-keep">{t.score.setsHint}</p>
              </div>
            )}

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

        {admin && (
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
            <p className="text-sm font-black text-brand-950">관리자</p>
            {state !== "done" && state !== "pending" && state !== "bye" && (
              <div className="flex gap-2">
                <select
                  value={tableChoice}
                  onChange={(e) => setTableChoice(e.target.value)}
                  aria-label="테이블"
                  className="field py-2"
                >
                  <option value="queue">자동 배정 (순서대로)</option>
                  <option value="hold">보류 (자동 배정에서 빼기)</option>
                  {Array.from({ length: tables }, (_, i) => (
                    <option key={i} value={String(i + 1)}>
                      {i + 1}번 테이블로
                    </option>
                  ))}
                </select>
                <button type="button" onClick={moveTable} disabled={pending} className="btn btn-ghost btn-sm shrink-0">
                  옮기기
                </button>
              </div>
            )}
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
      </div>
    </div>,
    document.body,
  );
}
