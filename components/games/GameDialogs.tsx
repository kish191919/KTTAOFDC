"use client";

import { useState, useTransition } from "react";
import { gameAction } from "@/lib/actions";
import { personKey } from "@/lib/draw/roster";
import { sameName } from "@/lib/games/names";
import {
  freeTables,
  gameResultKey,
  matchState,
  sideName,
  type GameError,
  type GameOp,
  type GamePayload,
  type PublicGame,
} from "@/lib/games/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { GameMatch } from "@/lib/types";
import { Dialog } from "@/components/draw/Dialog";
import { MatchSides, type MatchSide } from "@/components/draw/MatchSides";
import { NamePicker } from "./NamePicker";
import { readResult, ResultInput, startResult } from "./ResultInput";
import { useMe } from "./usePeople";

// 번개 게임의 창: 경기 결과(점수 적기·고치기), 경기 기록(자유 기록의 새 경기), 빈 테이블에서 칠 경기 고르기.

type Common = {
  lang: Locale;
  game: PublicGame;
  /** 이 휴대폰에 남은 만든 사람 열쇠. 마감된 게임도 만든 사람은 고칠 수 있습니다. */
  ownerKey: string | null;
  onSaved: (payload: GamePayload) => void;
  onClose: () => void;
};

/** 게임 조작을 보내고 결과에 따라 창을 닫거나 오류를 보여 줍니다. */
function useRun(
  { lang, game, ownerKey, onSaved, onClose }: Common,
  onError?: (error: GameError) => void,
) {
  const t = getDictionary(lang).games;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(op: GameOp, close = true) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await gameAction(game.id, op, ownerKey ?? undefined);
        if ("error" in result) {
          setError(t.errors[result.error]);
          onError?.(result.error);
          return;
        }
        onSaved(result);
        if (close) onClose();
      } catch {
        setError(t.errors.network);
      }
    });
  }
  return { run, error, setError, pending };
}

const errorNote = (error: string | null) =>
  error && (
    <p role="alert" className="mb-3 rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
      {error}
    </p>
  );

const tableButton =
  "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-60";

const eyebrowOf = (game: PublicGame, lang: Locale) =>
  `${getDictionary(lang).games.format[game.format]} · ${getDictionary(lang).draw.bestOf(game.bestOf)}`;

// ───────────────────────── 경기 결과 ─────────────────────────

/**
 * 경기 한 판의 결과 창. 세트 스코어 단추, 세트별 점수, 기권(리그전) 가운데 골라 적습니다.
 * 테이블을 쓰는 게임은 경기 전 경기를 빈 테이블에서 시작하거나, 경기 중인 테이블에서 내릴 수 있습니다.
 */
export function GameScoreDialog(
  props: Common & {
    match: GameMatch;
    /** 목록에서 b 쪽을 왼쪽에 두고 보던 경기면 창도 같은 순서로 그립니다. */
    flip: boolean;
    /** 기록할 수 있는지 (열린 게임이거나 만든 사람) */
    canEdit: boolean;
    /** 다른 사람이 먼저 고쳐 거절되었을 때 화면을 바로 새로 받아 오게 합니다. */
    onConflict: () => void;
  },
) {
  const { lang, game, match, flip, canEdit, onConflict } = props;
  const t = getDictionary(lang).games;
  const league = game.format === "league";
  const state = matchState(match, game.bestOf);
  const names = (flip ? [match.b, match.a] : [match.a, match.b]).map((side) => sideName(game, side)) as [
    string,
    string,
  ];
  const [value, setValue] = useState(() => startResult(match, game.bestOf, flip));
  // 창을 열 때 본 결과. 그 사이 다른 사람이 바꿨으면 저장을 거절하고, 그 뒤로는 새로 보이는 결과를 기준으로 삼습니다.
  const [base, setBase] = useState<string | null>(() => gameResultKey(match));
  const { run, error, setError, pending } = useRun(props, (failed) => {
    if (failed === "conflict") {
      setBase(null);
      onConflict();
    }
  });

  function save() {
    const input = readResult(value, flip);
    if (input === null) return setError(t.pickResult);
    if (input === "points") return setError(t.errors.points);
    run({ op: "score", match: match.id, previous: base ?? gameResultKey(match), input });
  }

  const tables = canEdit && game.tables > 0 && state !== "done" ? freeTables(game, match) : null;
  const hasResult = Boolean(match.sets || match.walkover);

  return (
    <Dialog
      eyebrow={eyebrowOf(game, lang)}
      title={
        <>
          {t.resultTitle}
          {match.table && (
            <span className="ml-2 rounded-full bg-accent-50 px-2.5 py-0.5 align-middle text-xs font-bold text-accent-700 ring-1 ring-accent-200">
              {t.table(match.table)}
            </span>
          )}
        </>
      }
      closeLabel={t.close}
      onClose={props.onClose}
      footer={
        canEdit && (
          <>
            {errorNote(error)}
            <button type="button" onClick={save} disabled={pending} className="btn btn-brand w-full">
              {pending ? t.saving : t.save}
            </button>
          </>
        )
      }
    >
      {canEdit ? (
        <ResultInput
          lang={lang}
          names={names}
          bestOf={game.bestOf}
          value={value}
          onChange={setValue}
          walkover={league}
        />
      ) : (
        <>
          <div className="mt-4">
            <MatchSides
              sides={
                (flip ? (["b", "a"] as const) : (["a", "b"] as const)).map((side, col) => ({
                  name: names[col],
                  decided: true,
                  score: match.walkover ? (match.walkover === side ? "W" : "–") : (match.sets?.[side === "a" ? 0 : 1] ?? ""),
                })) as [MatchSide, MatchSide]
              }
              versus={getDictionary(lang).draw.versus}
              size="board"
            />
          </div>
          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm break-keep text-slate-600">{t.closedNotice}</p>
        </>
      )}

      {/* 테이블: 경기 전이면 빈 테이블에서 시작(점수는 나중에), 경기 중이면 테이블에서 내리기 */}
      {tables !== null && (
        <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
          {match.table ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-accent-700">{t.playingAt(t.table(match.table))}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ op: "table", match: match.id, table: null }, false)}
                className="btn btn-ghost btn-sm"
              >
                {t.leaveTable}
              </button>
            </div>
          ) : tables === "playerBusy" ? (
            <p className="text-sm break-keep text-slate-600">{t.playerBusy}</p>
          ) : tables.length === 0 ? (
            <p className="text-sm break-keep text-slate-600">{t.noFreeTable}</p>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-500">{t.startAt}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tables.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={pending}
                    onClick={() => run({ op: "table", match: match.id, table: n })}
                    className={tableButton}
                  >
                    {t.table(n)}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {canEdit && (league ? hasResult : true) && (
        <div className="mt-5 border-t border-slate-100 pt-4 text-center">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (league) {
                if (window.confirm(t.clearConfirm)) {
                  run({ op: "score", match: match.id, previous: base ?? gameResultKey(match), input: { kind: "clear" } });
                }
              } else if (window.confirm(t.removeConfirm)) {
                run({ op: "removeMatch", match: match.id, previous: base ?? gameResultKey(match) });
              }
            }}
            className="text-sm font-bold text-accent-700 hover:underline disabled:opacity-60"
          >
            {league ? t.clearResult : t.removeMatch}
          </button>
        </div>
      )}
    </Dialog>
  );
}

// ───────────────────────── 경기 기록 (자유 기록) ─────────────────────────

/** 칸 번호: 0·1 은 왼쪽(a), 2·3 은 오른쪽(b). 단식은 0 과 2 만 씁니다. */
const slotsOf = (doubles: boolean) => (doubles ? [0, 1, 2, 3] : [0, 2]);

/**
 * 자유 기록의 새 경기. 양쪽 선수를 고르고 결과를 적습니다.
 * 테이블을 쓰는 게임은 점수 없이 빈 테이블에서 시작만 해 둘 수도 있습니다.
 * 이 휴대폰에 저장한 '내 이름'이 이 게임의 선수면 왼쪽 첫 칸에 미리 넣어 둡니다.
 */
export function RecordDialog(props: Common & { table?: number }) {
  const { lang, game, table } = props;
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const [me] = useMe();
  const last = game.matches.at(-1);
  const [doubles, setDoubles] = useState(last ? last.a.length === 2 : false);
  const mine = me ? game.players.find((p) => sameName(p.name, me))?.name : undefined;
  const [slots, setSlots] = useState<string[]>(() => [mine ?? "", "", "", ""]);
  const [active, setActive] = useState<number | null>(null);
  const [value, setValue] = useState(() => startResult(undefined, game.bestOf));
  const { run, error, setError, pending } = useRun(props);

  const used = slotsOf(doubles);
  const filled = used.map((i) => slots[i]).filter(Boolean);
  const target = active !== null && used.includes(active) && !slots[active] ? active : used.find((i) => !slots[i]);
  const ready = used.every((i) => slots[i]);
  const left = used.filter((i) => i < 2).map((i) => slots[i]);
  const right = used.filter((i) => i >= 2).map((i) => slots[i]);
  const joined = (names: string[]) => names.join(" · ");

  // 최근 경기에 나온 선수부터 (같은 사람들이 이어서 치는 경우가 많아서)
  const recent: string[] = [];
  for (const m of [...game.matches].reverse()) {
    for (const id of [...m.a, ...m.b]) {
      const name = game.players.find((p) => p.id === id)?.name;
      if (name && !recent.includes(name)) recent.push(name);
    }
  }
  for (const p of game.players) if (!recent.includes(p.name)) recent.push(p.name);

  function place(names: string[]) {
    const next = [...slots];
    let at = target;
    for (const name of names) {
      if (at === undefined) break;
      next[at] = name;
      at = used.find((i) => !next[i]);
    }
    setSlots(next);
    setActive(null);
    setError(null);
  }

  // 점수 없이 테이블에서 시작할 수 있는 빈 테이블. 고른 선수가 다른 테이블에서 경기 중이면 시작할 수 없습니다.
  const onTable = game.matches.filter((m) => m.table);
  const busyNames = new Set(
    onTable.flatMap((m) => [...m.a, ...m.b]).map((id) => personKey(game.players.find((p) => p.id === id)?.name ?? "")),
  );
  const busy = filled.some((name) => busyNames.has(personKey(name)));
  const taken = new Set(onTable.map((m) => m.table));
  const open = Array.from({ length: game.tables }, (_, i) => i + 1)
    .filter((n) => !taken.has(n))
    .sort((x, y) => Number(y === table) - Number(x === table));

  function save() {
    if (!ready) return setError(t.pickPlayers);
    const input = readResult(value);
    if (input === null) return setError(t.pickResult);
    if (input === "points") return setError(t.errors.points);
    run({ op: "record", a: left, b: right, input, table: null });
  }

  const slot = (i: number) => {
    const name = slots[i];
    const isTarget = !name && i === target;
    return (
      <button
        key={i}
        type="button"
        onClick={() => {
          // 이름이 있는 칸을 누르면 비우고 그 칸에 다시 고릅니다.
          if (name) setSlots(slots.map((s, k) => (k === i ? "" : s)));
          setActive(i);
        }}
        className={`min-h-11 w-full rounded-xl border-2 px-3 py-2 text-[15px] font-bold break-keep transition-colors ${
          name
            ? "border-brand-200 bg-brand-50 text-brand-900"
            : isTarget
              ? "border-dashed border-brand-500 bg-white text-brand-600"
              : "border-dashed border-slate-300 bg-white text-slate-400"
        }`}
      >
        {name || t.player(used.indexOf(i) + 1)}
      </button>
    );
  };

  return (
    <Dialog
      eyebrow={eyebrowOf(game, lang)}
      title={t.recordTitle}
      closeLabel={t.close}
      onClose={props.onClose}
      footer={
        <>
          {errorNote(error)}
          <button type="button" onClick={save} disabled={pending} className="btn btn-brand w-full">
            {pending ? t.saving : t.save}
          </button>
        </>
      }
    >
      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {[false, true].map((value) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={doubles === value}
            onClick={() => {
              setDoubles(value);
              // 단식으로 바꾸면 짝 칸을 비웁니다.
              if (!value) setSlots(slots.map((s, i) => (i === 1 || i === 3 ? "" : s)));
              setActive(null);
            }}
            className={`flex-1 rounded-lg px-2 py-2 text-sm font-bold transition-colors ${
              doubles === value ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-brand-700"
            }`}
          >
            {value ? t.doubles : t.singles}
          </button>
        ))}
      </div>

      {/* 양쪽 칸. 빈 칸을 누르고 아래에서 이름을 고릅니다. */}
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="space-y-1.5">{used.filter((i) => i < 2).map(slot)}</div>
        <span className="text-[11px] font-black text-slate-400">{d.versus}</span>
        <div className="space-y-1.5">{used.filter((i) => i >= 2).map(slot)}</div>
      </div>

      {!ready && (
        <div className="mt-4">
          <p className="mb-2 text-xs break-keep text-slate-500">{t.pickPlayersHint}</p>
          <NamePicker lang={lang} taken={filled} first={recent} onPick={place} hint={false} />
        </div>
      )}

      {ready && (
        <>
          <ResultInput
            lang={lang}
            names={[joined(left), joined(right)]}
            bestOf={game.bestOf}
            value={value}
            onChange={setValue}
          />
          {game.tables > 0 && (
            <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              {busy ? (
                <p className="text-sm break-keep text-slate-600">{t.playerBusy}</p>
              ) : open.length === 0 ? (
                <p className="text-sm break-keep text-slate-600">{t.noFreeTable}</p>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-500">{t.startAt}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {open.map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={pending}
                        onClick={() => run({ op: "record", a: left, b: right, input: null, table: n })}
                        className={tableButton}
                      >
                        {t.table(n)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}
    </Dialog>
  );
}

// ───────────────────────── 빈 테이블에서 시작 (리그전) ─────────────────────────

/** 빈 테이블에서 칠 리그전 경기 고르기. 아직 치지 않았고 선수가 다른 테이블에 없는 경기를 리그 순서로 보여 줍니다. */
export function StartDialog(props: Common & { table: number }) {
  const { lang, game, table } = props;
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const { run, error, pending } = useRun(props);
  const ready = game.matches.filter(
    (m) => matchState(m, game.bestOf) === "ready" && freeTables(game, m) !== "playerBusy",
  );

  return (
    <Dialog eyebrow={eyebrowOf(game, lang)} title={t.pickTitle(t.table(table))} closeLabel={t.close} onClose={props.onClose}>
      <div className="mt-4">{errorNote(error)}</div>
      {ready.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm break-keep text-slate-600">{t.pickEmpty}</p>
      ) : (
        <ul className="card divide-y divide-slate-100 overflow-hidden">
          {ready.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => run({ op: "table", match: m.id, table })}
                className="flex w-full items-center px-4 py-3 text-left transition-colors hover:bg-brand-50/60 disabled:opacity-60"
              >
                <MatchSides
                  sides={[
                    { name: sideName(game, m.a), decided: true },
                    { name: sideName(game, m.b), decided: true },
                  ]}
                  versus={d.versus}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
