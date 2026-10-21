"use client";

import { Fragment, useEffect, useId, useMemo, useState } from "react";
import { dateOf, formatDate } from "@/lib/dates";
import { personKey } from "@/lib/draw/roster";
import {
  matchState,
  matchWinner,
  playerName,
  sideKey,
  sideName,
  summarize,
  type GameRow,
  type PublicGame,
  type GamePayload,
} from "@/lib/games/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import type { GameMatch } from "@/lib/types";
import { CheckIcon, ChevronDownIcon, CopyIcon, PencilIcon, PlusIcon, StarIcon } from "@/components/icons";
import { MatchSides, type MatchSide } from "@/components/draw/MatchSides";
import { clockTime } from "@/components/draw/labels";
import { useStored } from "@/components/draw/useStored";
import { GameScoreDialog, RecordDialog, StartDialog } from "./GameDialogs";
import { OwnerPanel } from "./OwnerPanel";
import { useLiveGame } from "./useLiveGame";
import { ownerKeyStorage, useMe } from "./usePeople";

type T = Dictionary["games"];
type D = Dictionary["draw"];

/** 경기를 누르면 결과 창을 엽니다. flip 은 b 쪽을 왼쪽에 두고 보던 경기입니다. */
type OpenMatch = (match: GameMatch, flip?: boolean) => void;

type Props = {
  lang: Locale;
  initial: GamePayload;
  /** 관리자로 로그인했으면 만든 사람처럼 관리할 수 있습니다. */
  admin: boolean;
  /** 서버가 이 화면을 만든 때 (처음 화면의 '○시 ○분 기준' 표시) */
  renderedAt: string;
};

/**
 * 번개 게임 화면: 순위표, 경기 목록(리그전) 또는 경기 기록(자유 기록), 테이블 현황, 관리.
 * 5초마다 새 결과를 받아 와 다시 그립니다.
 */
export function GameBoard({ lang, initial, admin, renderedAt }: Props) {
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const { payload, online, checkedAt, gone, refresh, apply, setGone } = useLiveGame(initial.game.id, initial);
  const { game, open } = payload;
  const [ownerKey, setOwnerKey] = useStored(ownerKeyStorage(game.id));
  const [me] = useMe();
  const owner = admin || Boolean(ownerKey);
  const canRecord = (open || owner) && !gone;
  const league = game.format === "league";
  const summary = useMemo(() => summarize(game), [game]);

  const [opened, setOpened] = useState<{ match: string; flip: boolean } | null>(null);
  /** 자유 기록의 경기 기록 창 (빈 테이블 카드에서 열면 그 테이블) */
  const [recording, setRecording] = useState<{ table?: number } | null>(null);
  /** 리그전에서 칠 경기를 고르고 있는 빈 테이블 */
  const [starting, setStarting] = useState<number | null>(null);

  // 관리 링크(#key=…)로 열었으면 열쇠를 이 휴대폰에 저장하고 주소에서 지웁니다.
  useEffect(() => {
    const found = /key=([\w-]+)/.exec(window.location.hash);
    if (!found) return;
    setOwnerKey(found[1]);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, [setOwnerKey]);

  const meKey = me ? personKey(me) : null;
  const isMe = (side: string[]) => Boolean(meKey) && side.some((id) => personKey(playerName(game, id)) === meKey);
  const open_: OpenMatch = (match, flip = false) => setOpened({ match: match.id, flip });
  const openedMatch = opened && game.matches.find((m) => m.id === opened.match);
  const common = { lang, game, ownerKey, onSaved: apply };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-bold text-accent-600">
          {t.format[game.format]} · {d.bestOf(game.bestOf)}
        </p>
        <h1 className="mt-1.5 text-2xl leading-tight font-black break-keep text-brand-950 md:mt-2 md:text-3xl">
          {game.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {formatDate(dateOf(game.createdAt), true, lang)} ·{" "}
          {league && game.doubles ? t.teams(game.teams.length) : t.people(game.players.length)}
          {game.tables > 0 && ` · ${t.tablesTitle} ${game.tables}`}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <ShareButton t={t} title={game.title} />
          <p aria-live="polite" className={`text-xs ${online ? "text-slate-400" : "font-bold text-accent-600"}`}>
            <span suppressHydrationWarning>
              {online ? t.updated(clockTime(checkedAt ?? renderedAt, lang, true)) : t.reconnecting}
            </span>
          </p>
        </div>
      </header>

      {(gone || !open) && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold break-keep text-slate-600">
          {gone ? t.deletedNotice : t.closedNotice}
        </p>
      )}

      {summary.podium && <Podium t={t} d={d} game={game} rows={summary.podium} />}

      {game.tables > 0 && (
        <TablesView
          t={t}
          d={d}
          game={game}
          canRecord={canRecord}
          onOpen={open_}
          onStart={(table) => (league ? setStarting(table) : setRecording({ table }))}
        />
      )}

      <Standings
        t={t}
        d={d}
        game={game}
        rows={summary.rows}
        progress={league ? t.progress(summary.done, summary.total) : t.matchCount(summary.total)}
        isMe={isMe}
        canRecord={canRecord}
        onOpen={open_}
      />

      {league ? (
        <LeagueMatches t={t} d={d} game={game} canRecord={canRecord} onOpen={open_} />
      ) : (
        <MatchLog t={t} d={d} lang={lang} game={game} canRecord={canRecord} onOpen={open_} />
      )}

      {/* 자유 기록은 화면을 내려 봐도 '경기 기록하기'가 늘 아래에 보입니다. (게임 관리를 가리지 않게 그 앞에 둡니다) */}
      {!league && canRecord && (
        <div className="sticky bottom-4 z-20 flex justify-center">
          <button type="button" onClick={() => setRecording({})} className="btn btn-accent shadow-lg">
            <PlusIcon className="size-5" />
            {t.record}
          </button>
        </div>
      )}

      {owner && !gone && (
        <OwnerPanel
          lang={lang}
          game={game}
          open={open}
          ownerKey={ownerKey}
          admin={admin}
          onSaved={apply}
          onDeleted={() => {
            setOwnerKey(null);
            setGone(true);
          }}
        />
      )}

      {opened && openedMatch && (
        <GameScoreDialog
          key={openedMatch.id}
          {...common}
          match={openedMatch}
          flip={opened.flip}
          canEdit={canRecord}
          onConflict={refresh}
          onClose={() => setOpened(null)}
        />
      )}
      {recording && <RecordDialog {...common} table={recording.table} onClose={() => setRecording(null)} />}
      {starting !== null && starting <= game.tables && (
        <StartDialog key={starting} {...common} table={starting} onClose={() => setStarting(null)} />
      )}
    </div>
  );
}

// ───────────────────────── 공통 조각 ─────────────────────────

/** 링크 보내기. 휴대폰에서는 카카오톡·문자 같은 공유 창을 열고, 컴퓨터에서는 주소를 복사합니다. */
function ShareButton({ t, title }: { t: T; title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = `${window.location.origin}${window.location.pathname}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: t.shareText(title), url });
      } catch {
        // 공유 창을 닫은 경우
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t.share, url);
    }
  }
  return (
    <button type="button" onClick={share} className="btn btn-ghost btn-sm">
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      {copied ? t.copied : t.share}
    </button>
  );
}

/** 경기 상태 표시: 끝났으면 체크, 경기 중이면 테이블, 경기 전이면 점수 입력(기록할 수 있을 때) */
function StateChip({ match, game, canRecord, t, d }: { match: GameMatch; game: PublicGame; canRecord: boolean; t: T; d: D }) {
  const state = matchState(match, game.bestOf);
  if (state === "done") {
    return (
      <span className="inline-flex shrink-0 text-slate-400">
        <CheckIcon className="size-4" />
        <span className="sr-only">{d.state.done}</span>
      </span>
    );
  }
  if (state === "playing") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-accent-700 ring-1 ring-accent-200">
        <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
        {match.table ? t.table(match.table) : d.state.playing}
      </span>
    );
  }
  if (!canRecord) {
    return <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-400">{d.state.ready}</span>;
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-bold whitespace-nowrap text-brand-700 shadow-xs">
      <PencilIcon className="size-3.5" />
      {d.enterScore}
    </span>
  );
}

/** 경기 목록(MatchRow 를 담는 ul). 줄마다 칸 너비를 같게 하려고 목록 전체를 한 격자로 두고 줄은 subgrid 로 나눠 씁니다. */
const matchListGrid = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-x-2 divide-y divide-slate-100 sm:gap-x-3";

/**
 * 경기 한 줄 "홍길동  3 vs 1  김철수  ✓". 누르면 결과 창이 같은 좌우 순서로 열립니다.
 * focus 를 주면 그 쪽(순위표에서 펼친 사람·팀)을 늘 굵게 왼쪽에 두고, 이겼으면 초록 · 졌으면 옅은 빨강으로 칠합니다.
 */
function MatchRow({
  game,
  match,
  focus,
  label,
  canRecord,
  t,
  d,
  onOpen,
}: {
  game: PublicGame;
  match: GameMatch;
  focus?: string[];
  /** 줄 위에 작게 적는 글 (자유 기록의 시각) */
  label?: string;
  canRecord: boolean;
  t: T;
  d: D;
  onOpen: OpenMatch;
}) {
  const flip = Boolean(focus) && focus!.every((id) => match.b.includes(id));
  const winner = matchWinner(match, game.bestOf);
  const score = (side: "a" | "b") =>
    match.walkover ? (match.walkover === side ? "W" : "–") : (match.sets?.[side === "a" ? 0 : 1] ?? "");
  const [left, right] = flip ? (["b", "a"] as const) : (["a", "b"] as const);
  const leftWon = winner === left;
  const leftStyle = focus
    ? `font-black ${leftWon ? "text-emerald-600" : winner ? "text-accent-400" : "text-brand-950"}`
    : leftWon
      ? "font-black text-brand-950"
      : winner
        ? "text-slate-500"
        : "font-semibold text-slate-800";
  const rightStyle = !focus && winner === right ? "font-black text-brand-950" : winner ? "text-slate-500" : "text-slate-700";

  return (
    <button
      type="button"
      onClick={() => onOpen(match, flip)}
      className="col-span-4 grid grid-cols-subgrid items-center gap-y-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-brand-50/60 sm:px-4"
    >
      {label && <span className="col-span-4 text-xs font-bold text-slate-400">{label}</span>}
      {/* 펼친 쪽이 없으면 왼쪽 이름을 vs 쪽으로 붙여, 넓은 화면에서도 두 이름이 가운데에 모입니다. */}
      <span className={`break-keep ${focus ? "" : "text-right"} ${leftStyle}`}>{sideName(game, match[left])}</span>
      <span className="flex items-center gap-1.5 font-black text-slate-700 tabular-nums">
        <span className="w-4 text-right">{score(left)}</span>
        <span className="text-[11px] text-slate-400">{d.versus}</span>
        <span className="w-4">{score(right)}</span>
      </span>
      <span className={`break-keep ${rightStyle}`}>{sideName(game, match[right])}</span>
      <span className="flex justify-end">
        <StateChip match={match} game={game} canRecord={canRecord} t={t} d={d} />
      </span>
      {match.points && match.points.length > 0 && (
        <span className="col-span-4 text-xs text-slate-400 tabular-nums">
          {match.points.map(([a, b]) => (flip ? `${b}-${a}` : `${a}-${b}`)).join(", ")}
        </span>
      )}
    </button>
  );
}

// ───────────────────────── 최종 순위 ─────────────────────────

/** 리그전의 모든 경기가 끝나면 1·2·3위를 맨 위에 보여 줍니다. */
function Podium({ t, d, game, rows }: { t: T; d: D; game: PublicGame; rows: GameRow[] }) {
  const labels = [d.podium.champion, d.podium.second, d.podium.third];
  return (
    <section aria-label={t.standings} className="card grid gap-px overflow-hidden bg-slate-200 sm:grid-cols-3">
      {rows.map((row, i) => (
        <div key={sideKey(row.side)} className="bg-white px-5 py-4">
          <p className={`text-xs font-bold ${i === 0 ? "text-accent-600" : "text-slate-500"}`}>{labels[i]}</p>
          <p className={`mt-1 break-keep ${i === 0 ? "text-lg font-black text-brand-950" : "font-bold text-slate-800"}`}>
            {sideName(game, row.side)}
          </p>
        </div>
      ))}
    </section>
  );
}

// ───────────────────────── 테이블 ─────────────────────────

function TablesView({
  t,
  d,
  game,
  canRecord,
  onOpen,
  onStart,
}: {
  t: T;
  d: D;
  game: PublicGame;
  canRecord: boolean;
  onOpen: OpenMatch;
  onStart: (table: number) => void;
}) {
  return (
    <section aria-labelledby="tables-heading">
      <h2 id="tables-heading" className="text-xl font-black text-brand-950">
        {t.tablesTitle}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {Array.from({ length: game.tables }, (_, i) => i + 1).map((n) => {
          const match = game.matches.find((m) => m.table === n);
          if (!match) {
            return (
              <li key={n} className="card flex min-h-14 items-center justify-between gap-3 bg-slate-50/60 px-4 py-2.5">
                <span className="text-sm font-black text-slate-500">
                  <span className="whitespace-nowrap">{t.table(n)}</span>
                  <span className="ml-2 font-semibold text-slate-400">{t.tableOpen}</span>
                </span>
                {canRecord && (
                  <button type="button" onClick={() => onStart(n)} className="btn btn-ghost btn-sm shrink-0">
                    <PlusIcon className="size-4" />
                    {t.startMatch}
                  </button>
                )}
              </li>
            );
          }
          return (
            <li key={n} className="card overflow-hidden border-accent-200">
              <button type="button" onClick={() => onOpen(match)} className="block w-full text-left transition-colors hover:bg-brand-50/60">
                <span className="flex items-center gap-1.5 bg-accent-50 px-3.5 py-2 text-sm font-black text-accent-700">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
                  {t.table(n)} · {d.state.playing}
                </span>
                <span className="block px-3.5 py-2.5">
                  <MatchSides
                    sides={(["a", "b"] as const).map((side, i) => ({
                      name: sideName(game, match[side]),
                      decided: true,
                      score: match.sets?.[i] ?? "",
                    })) as [MatchSide, MatchSide]}
                    versus={d.versus}
                    size="compact"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ───────────────────────── 순위표 ─────────────────────────

/**
 * 순위표. 줄을 누르면 그 사람(팀)의 경기가 줄 아래에 펼쳐지고, 경기를 누르면 결과 창이 열립니다.
 * 이 휴대폰에 저장한 내 이름이 든 줄에는 '나' 표시를 둡니다.
 */
function Standings({
  t,
  d,
  game,
  rows,
  progress,
  isMe,
  canRecord,
  onOpen,
}: {
  t: T;
  d: D;
  game: PublicGame;
  rows: GameRow[];
  progress: string;
  isMe: (side: string[]) => boolean;
  canRecord: boolean;
  onOpen: OpenMatch;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const panelId = useId();
  const league = game.format === "league";
  const teamIndex = (side: string[]) => game.teams.findIndex((team) => sideKey(team) === sideKey(side));
  /** 그 줄의 경기. 리그전은 상대의 리그 순서, 자유 기록은 최근 경기부터 */
  const matchesOf = (side: string[]) => {
    const mine = game.matches.filter((m) =>
      league ? [sideKey(m.a), sideKey(m.b)].includes(sideKey(side)) : [...m.a, ...m.b].includes(side[0]),
    );
    if (!league) return mine.reverse();
    const other = (m: GameMatch) => (sideKey(m.a) === sideKey(side) ? m.b : m.a);
    return mine.sort((x, y) => teamIndex(other(x)) - teamIndex(other(y)));
  };

  return (
    <section aria-labelledby="standings-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="standings-heading" className="text-xl font-black text-brand-950">
          {t.standings}
        </h2>
        <span className="text-sm font-semibold text-slate-500">{progress}</span>
      </div>
      <p className="mt-1.5 text-xs break-keep text-slate-500">
        {league ? d.rankingRule : t.freeRankingRule} {rows.length > 0 && t.tapName}
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
          {t.noMatchesYet}
        </p>
      ) : (
        <article className="card mt-3 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th scope="col" className="w-11 py-2 text-center font-bold">{d.rank}</th>
                <th scope="col" className="py-2 text-left font-bold">{d.entryHeading(league && game.doubles)}</th>
                <th scope="col" className="w-16 py-2 text-center font-bold">{d.record}</th>
                <th scope="col" className="w-18 py-2 text-center font-bold">{d.games}</th>
                <th scope="col" className="w-9" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = sideKey(row.side);
                const expanded = selected === key;
                const rowPanel = `${panelId}-${key}`;
                const mine = isMe(row.side);
                return (
                  <Fragment key={key}>
                    {/* 줄 어디를 눌러도 펼쳐지게 클릭은 줄이 받습니다. 이름 버튼은 키보드·화면 낭독기용입니다. */}
                    <tr
                      onClick={() => setSelected(expanded ? null : key)}
                      className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                        expanded ? "bg-brand-50/70" : "hover:bg-brand-50/40"
                      }`}
                    >
                      <td className="py-2.5 text-center font-black text-brand-700 tabular-nums">
                        {row.played > 0 ? row.rank : "–"}
                      </td>
                      <td className="py-2.5 pr-2">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={rowPanel}
                          className={`text-left font-semibold break-keep ${expanded ? "text-brand-800" : "text-slate-800"}`}
                        >
                          {sideName(game, row.side)}
                        </button>
                        {mine && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-accent-700">
                            <StarIcon className="size-3" fill="currentColor" />
                            {t.me}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center whitespace-nowrap text-slate-700 tabular-nums">
                        {d.winLoss(row.wins, row.losses)}
                      </td>
                      <td className="py-2.5 text-center text-slate-500 tabular-nums">
                        {row.setsWon}:{row.setsLost}
                      </td>
                      <td className="py-2.5 pr-3">
                        <ChevronDownIcon
                          className={`ml-auto size-4 transition-transform duration-200 ${
                            expanded ? "rotate-180 text-brand-700" : "text-slate-400"
                          }`}
                        />
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={rowPanel} className="border-b border-slate-100 bg-brand-50/70 last:border-0">
                        <td colSpan={5} className="p-0 sm:px-3 sm:pb-3">
                          {matchesOf(row.side).length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500">{t.noMatchesYet}</p>
                          ) : (
                            <ul className={`${matchListGrid} overflow-hidden border-y border-brand-100 bg-white sm:rounded-lg sm:border`}>
                              {matchesOf(row.side).map((match) => (
                                <li key={match.id} className="col-span-4 grid grid-cols-subgrid">
                                  <MatchRow
                                    game={game}
                                    match={match}
                                    focus={row.side}
                                    canRecord={canRecord}
                                    t={t}
                                    d={d}
                                    onOpen={onOpen}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </article>
      )}
    </section>
  );
}

// ───────────────────────── 경기 목록 ─────────────────────────

/** 리그전: 남은 경기(경기 중인 것 먼저)와, 접어 둔 끝난 경기 */
function LeagueMatches({
  t,
  d,
  game,
  canRecord,
  onOpen,
}: {
  t: T;
  d: D;
  game: PublicGame;
  canRecord: boolean;
  onOpen: OpenMatch;
}) {
  const [showDone, setShowDone] = useState(false);
  const left = game.matches
    .filter((m) => matchState(m, game.bestOf) !== "done")
    .sort((x, y) => Number(matchState(y, game.bestOf) === "playing") - Number(matchState(x, game.bestOf) === "playing"));
  const done = game.matches
    .filter((m) => matchState(m, game.bestOf) === "done")
    .sort((x, y) => (y.finishedAt ?? "").localeCompare(x.finishedAt ?? ""));
  const list = (matches: GameMatch[]) => (
    <ul className={`${matchListGrid} card mt-3 overflow-hidden`}>
      {matches.map((match) => (
        <li key={match.id} className="col-span-4 grid grid-cols-subgrid">
          <MatchRow game={game} match={match} canRecord={canRecord} t={t} d={d} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-labelledby="matches-heading">
      <h2 id="matches-heading" className="text-xl font-black text-brand-950">
        {t.remaining(left.length)}
      </h2>
      {left.length > 0 ? list(left) : <p className="mt-2 text-sm text-slate-500">{t.allDone}</p>}
      {done.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone(!showDone)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-brand-700"
          >
            {showDone ? t.hideFinished : t.showFinished}
            <span className="text-slate-400">{done.length}</span>
            <ChevronDownIcon className={`size-4 transition-transform ${showDone ? "rotate-180" : ""}`} />
          </button>
          {showDone && list(done)}
        </div>
      )}
    </section>
  );
}

/** 자유 기록: 적은 경기를 최근 것부터 */
function MatchLog({
  t,
  d,
  lang,
  game,
  canRecord,
  onOpen,
}: {
  t: T;
  d: D;
  lang: Locale;
  game: PublicGame;
  canRecord: boolean;
  onOpen: OpenMatch;
}) {
  const matches = [...game.matches].reverse();
  return (
    <section aria-labelledby="log-heading">
      <h2 id="log-heading" className="text-xl font-black text-brand-950">
        {t.log} <span className="text-base font-bold text-slate-400">{matches.length}</span>
      </h2>
      {matches.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center text-sm break-keep text-slate-500">
          {t.logEmpty}
        </p>
      ) : (
        <ul className={`${matchListGrid} card mt-3 overflow-hidden`}>
          {matches.map((match) => (
            <li key={match.id} className="col-span-4 grid grid-cols-subgrid">
              <MatchRow
                game={game}
                match={match}
                label={match.createdAt ? clockTime(match.createdAt, lang) : undefined}
                canRecord={canRecord}
                t={t}
                d={d}
                onOpen={onOpen}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
