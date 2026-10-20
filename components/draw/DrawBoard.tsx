"use client";

import { useMemo, useState } from "react";
import { entryName } from "@/lib/draw/entries";
import {
  eventContext,
  tableBoard,
  winnerOf,
  withGroupTables,
  type EventContext,
  type MatchState,
  type QueueItem,
  type TableBoard,
  type TableSlot,
} from "@/lib/draw/play";
import {
  entryStatus,
  groupLetter,
  isByeMatch,
  podium,
  roundSize,
  type EntryStatus,
} from "@/lib/draw/view";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Draw, DrawEvent, DrawMatch } from "@/lib/types";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { clockTime, eventName, matchLabel, pointsText, sideName, slotLabel } from "./labels";
import { MatchSides, type MatchSide } from "./MatchSides";
import { ScoreDialog } from "./ScoreDialog";
import { startableAt, TablePicker } from "./TablePicker";

type T = Dictionary["draw"];

type Props = {
  tournamentId: string;
  lang: Locale;
  draw: Draw;
  /** 방문자가 지금 점수를 입력할 수 있는지 */
  scoring: boolean;
  /** 관리자 화면에서 쓰면 입력 기록 탭과 관리자 기능이 더해집니다. */
  admin?: boolean;
  onDraw: (draw: Draw) => void;
  onRefresh: () => void;
};

type Opened = { event: string; match: string };

/** 실시간 대진표 본 화면: 내 경기 찾기, 테이블 현황, 종목별 조 편성과 본선 대진표 */
export function DrawBoard({ tournamentId, lang, draw: saved, scoring, admin = false, onDraw, onRefresh }: Props) {
  const t = getDictionary(lang).draw;
  // 조 테이블을 아직 정하지 않은 대진표는 저장할 때와 똑같이 채워서 그립니다.
  const draw = useMemo(() => withGroupTables(saved), [saved]);
  const live = draw.events.filter((event) => event.status === "live");
  const contexts = useMemo(() => draw.events.map(eventContext), [draw]);
  const board = useMemo(() => tableBoard(draw, contexts), [draw, contexts]);
  const contextOf = (event: DrawEvent) => contexts[draw.events.indexOf(event)];

  const [tab, setTab] = useState<string>(draw.tables > 0 ? "tables" : (live[0]?.id ?? "tables"));
  const [opened, setOpened] = useState<Opened | null>(null);
  /** 경기를 고르고 있는 빈 테이블 */
  const [picking, setPicking] = useState<number | null>(null);

  if (live.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-12 text-center break-keep text-slate-500">
        {t.preparing}
      </p>
    );
  }

  const open = (event: DrawEvent, match: DrawMatch) => setOpened({ event: event.id, match: match.id });
  const openedEvent = opened && draw.events.find((e) => e.id === opened.event);
  const openedMatch = openedEvent?.matches.find((m) => m.id === opened?.match);
  // 테이블이 없는 대회는 테이블 현황 탭 없이 첫 종목을 보여 줍니다.
  const current =
    live.find((event) => event.id === tab) ??
    (draw.tables > 0 || (tab === "log" && admin) ? undefined : live[0]);
  const tabs = [
    ...(draw.tables > 0 ? [{ id: "tables", label: t.tablesTab }] : []),
    ...live.map((event) => ({ id: event.id, label: eventName(event, lang) })),
    ...(admin ? [{ id: "log", label: "입력 기록" }] : []),
  ];

  return (
    <div className="space-y-6">
      <EntryFinder lang={lang} live={live} contextOf={contextOf} board={board} onOpen={open} />

      <div role="tablist" aria-label={t.viewsLabel} className="flex flex-wrap gap-2">
        {tabs.map((item) => {
          const active = item.id === (current?.id ?? (tab === "log" ? "log" : "tables"));
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
                active
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {current ? (
        <EventView lang={lang} event={current} context={contextOf(current)} board={board} onOpen={open} />
      ) : tab === "log" && admin ? (
        <LogView lang={lang} draw={draw} contextOf={contextOf} />
      ) : (
        <TablesView
          lang={lang}
          board={board}
          contextOf={contextOf}
          canStart={(table) => (scoring || admin) && startableAt(draw, board, contexts, table, admin).length > 0}
          onOpen={open}
          onPick={setPicking}
        />
      )}

      {openedEvent && openedMatch && (
        <ScoreDialog
          key={`${openedEvent.id}:${openedMatch.id}`}
          tournamentId={tournamentId}
          lang={lang}
          event={openedEvent}
          match={openedMatch}
          context={contextOf(openedEvent)}
          scoring={scoring}
          admin={admin}
          draw={draw}
          board={board}
          contexts={contexts}
          onSaved={onDraw}
          onConflict={onRefresh}
          onClose={() => setOpened(null)}
        />
      )}

      {picking !== null && picking <= draw.tables && (
        <TablePicker
          key={picking}
          tournamentId={tournamentId}
          lang={lang}
          draw={draw}
          board={board}
          contexts={contexts}
          table={picking}
          admin={admin}
          onSaved={onDraw}
          onConflict={onRefresh}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────── 공통 조각 ─────────────────────────

/** 경기 상태 표시. 경기 중이면 테이블 번호를 함께 적습니다. */
function StateChip({ state, table, t }: { state: MatchState; table?: number; t: T }) {
  if (state === "playing") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700 ring-1 ring-accent-200">
        <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
        {table ? t.table(table) : t.state.playing}
      </span>
    );
  }
  const style =
    state === "ready"
      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100"
      : state === "done"
        ? "bg-slate-100 text-slate-600"
        : "bg-slate-50 text-slate-400";
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>
      {t.state[state]}
    </span>
  );
}

/** 경기 한 줄: 두 참가자와 게임 수. 누르면 점수 입력 창이 열립니다. */
function MatchLine({
  event,
  match,
  context,
  t,
  onOpen,
  label,
  chip = true,
  table,
  compact = false,
}: {
  event: DrawEvent;
  match: DrawMatch;
  context: EventContext;
  t: T;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
  label?: string;
  chip?: boolean;
  /** 경기 중인 테이블 (상태 표시에 적습니다) */
  table?: number;
  /** 테이블 카드처럼 좁은 칸에 넣을 때 */
  compact?: boolean;
}) {
  const state = context.stateOf(match);
  const winner = winnerOf(match, event.bestOf);
  const sides = (["a", "b"] as const).map((side, i) => {
    const { name, entry } = sideName(match, side, context, t);
    return {
      name,
      decided: Boolean(entry),
      score: match.walkover ? (match.walkover === side ? "W" : "–") : (match.sets?.[i] ?? ""),
    };
  }) as [MatchSide, MatchSide];
  const clickable = state !== "pending" && state !== "bye";
  return (
    <button
      type="button"
      onClick={() => clickable && onOpen(event, match)}
      disabled={!clickable}
      className={`flex w-full items-center gap-3 text-left transition-colors enabled:hover:bg-brand-50/60 disabled:cursor-default ${
        compact ? "px-3 py-2.5" : "px-4 py-3"
      }`}
    >
      <span className="min-w-0 flex-1">
        {label && <span className="mb-1.5 block text-xs font-bold text-slate-400">{label}</span>}
        <MatchSides sides={sides} winner={winner} versus={t.versus} size={compact ? "compact" : "normal"} />
        {match.points && match.points.length > 0 && (
          <span className="mt-1 block text-xs text-slate-400 tabular-nums">{pointsText(match)}</span>
        )}
      </span>
      {chip && <StateChip state={state} table={table} t={t} />}
    </button>
  );
}

// ───────────────────────── 내 경기 찾기 ─────────────────────────

const searchKey = (text: string) => text.replace(/\s+/g, "").toLowerCase();

function EntryFinder({
  lang,
  live,
  contextOf,
  board,
  onOpen,
}: {
  lang: Locale;
  live: DrawEvent[];
  contextOf: (event: DrawEvent) => EventContext;
  board: TableBoard;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
}) {
  const t = getDictionary(lang).draw;
  const [query, setQuery] = useState("");
  const key = searchKey(query);
  const found = key
    ? live.flatMap((event) =>
        event.entries
          .filter((entry) => entry.players.some((p) => searchKey(p).includes(key)))
          .map((entry) => ({ event, entry })),
      ).slice(0, 8)
    : [];

  return (
    <section aria-labelledby="find-heading" className="card p-4 sm:p-5">
      <h2 id="find-heading" className="text-base font-black text-brand-950">{t.findTitle}</h2>
      <div className="relative mt-3">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.findPlaceholder}
          aria-label={t.findTitle}
          className="field pl-11"
        />
      </div>
      {key && found.length === 0 && <p className="mt-3 text-sm text-slate-500">{t.findEmpty}</p>}
      {found.length > 0 && (
        <ul className="mt-3 space-y-3">
          {found.map(({ event, entry }) => {
            const context = contextOf(event);
            const status = entryStatus(context, board, entry.id);
            const group = event.groups.findIndex((members) => members.includes(entry.id));
            const row = group >= 0 ? context.standings(group).find((r) => r.entry === entry.id) : undefined;
            return (
              <li key={`${event.id}:${entry.id}`} className="rounded-xl border border-brand-100 bg-brand-50/40">
                <div className="px-4 pt-3">
                  <p className="text-xs font-bold text-accent-600">
                    {eventName(event, lang)}
                    {group >= 0 && ` · ${t.group(groupLetter(group))}`}
                    {row && row.played > 0 && ` · ${t.winLoss(row.wins, row.losses)}`}
                  </p>
                  <p className="mt-0.5 font-black break-keep text-brand-950">{entryName(entry)}</p>
                </div>
                <StatusLine status={status} event={event} context={context} t={t} onOpen={onOpen} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusLine({
  status,
  event,
  context,
  t,
  onOpen,
}: {
  status: EntryStatus;
  event: DrawEvent;
  context: EventContext;
  t: T;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
}) {
  const text = (headline: string, tone: "accent" | "brand" | "muted" = "muted") => (
    <p
      className={`px-4 pt-1.5 pb-3 text-sm font-bold break-keep ${
        tone === "accent" ? "text-accent-700" : tone === "brand" ? "text-brand-700" : "text-slate-600"
      }`}
    >
      {headline}
    </p>
  );

  switch (status.kind) {
    case "playing":
    case "ready": {
      const headline =
        status.kind === "playing"
          ? status.table
            ? t.status.playingAt(t.table(status.table))
            : t.status.playing
          : status.table
            ? t.status.nextAt(t.table(status.table))
            : t.status.nextFree;
      return (
        <>
          <p
            className={`px-4 pt-1.5 text-sm font-bold break-keep ${
              status.kind === "playing" ? "text-accent-700" : "text-brand-700"
            }`}
          >
            {headline}
            {status.kind === "ready" && (status.absent || status.busy) && (
              <span className="ml-2 font-semibold text-slate-500">
                ({status.absent ? t.notArrived : t.playerBusy})
              </span>
            )}
          </p>
          {status.kind === "ready" && status.absent && (
            <p className="px-4 pt-1 text-xs break-keep text-accent-700">{t.status.checkInFirst}</p>
          )}
          <div className="mt-1 border-t border-brand-100">
            <MatchLine
              event={event}
              match={status.match}
              context={context}
              t={t}
              onOpen={onOpen}
              label={matchLabel(event, status.match, t)}
              chip={false}
            />
          </div>
        </>
      );
    }
    case "waitingOpponent": {
      const [a] = context.participants(status.match);
      const other = "entry" in a ? status.match.b : status.match.a;
      return text(
        `${t.status.next}: ${matchLabel(event, status.match, t)} · ${t.status.opponent} ${slotLabel(other, context, t)}`,
        "brand",
      );
    }
    case "waitingGroup":
      return text(t.status.waitingGroup);
    case "outGroup":
      return text(t.status.outGroup(t.group(groupLetter(status.group)), status.rank));
    case "outRound":
      return text(t.status.outRound(t.round(roundSize(event, status.round))));
    case "excluded":
      return text(t.status.excluded);
    case "forfeit":
      return text(t.status.forfeit);
    case "champion":
      return text(t.status.champion, "accent");
    case "finished":
      return text(t.status.finished);
    case "notStarted":
      return text(t.status.notStarted);
  }
}

// ───────────────────────── 테이블 현황 ─────────────────────────

function TablesView({
  lang,
  board,
  contextOf,
  canStart,
  onOpen,
  onPick,
}: {
  lang: Locale;
  board: TableBoard;
  contextOf: (event: DrawEvent) => EventContext;
  /** 빈 테이블에서 시작할 수 있는 경기가 있는지 (점수 입력을 할 수 있을 때만) */
  canStart: (table: number) => boolean;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
  onPick: (table: number) => void;
}) {
  const t = getDictionary(lang).draw;
  const queued = new Map(board.queue.map((item) => [item.match, item]));
  const hasGroups = board.tables.some((slot) => slot.groups.length > 0);

  return (
    <div className="space-y-8">
      <section aria-label={t.tablesTab}>
        {hasGroups && <p className="mb-3 text-sm break-keep text-slate-500">{t.groupTableHint}</p>}
        <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {board.tables.map((slot) => (
            <TableCard
              key={slot.table}
              lang={lang}
              slot={slot}
              queued={queued}
              contextOf={contextOf}
              canStart={canStart}
              onOpen={onOpen}
              onPick={onPick}
            />
          ))}
        </ul>
      </section>

      {board.elsewhere.length > 0 && (
        <section aria-labelledby="elsewhere-heading">
          <h2 id="elsewhere-heading" className="text-base font-black text-brand-950">{t.elsewhere}</h2>
          <ul className="card mt-3 divide-y divide-slate-100 overflow-hidden">
            {board.elsewhere.map(({ event, match }) => (
              <li key={`${event.id}:${match.id}`}>
                <MatchLine
                  event={event}
                  match={match}
                  context={contextOf(event)}
                  t={t}
                  onOpen={onOpen}
                  label={`${eventName(event, lang)} · ${matchLabel(event, match, t)}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * 테이블 카드 하나. 경기 중인 경기와, 이 테이블을 쓰는 조의 남은 경기를 보여 줍니다.
 * 맡은 조가 없고 경기도 없으면 한 줄짜리 빈 테이블 카드로, 칠 경기를 고르는 버튼을 둡니다.
 */
function TableCard({
  lang,
  slot,
  queued,
  contextOf,
  canStart,
  onOpen,
  onPick,
}: {
  lang: Locale;
  slot: TableSlot;
  queued: Map<DrawMatch, QueueItem>;
  contextOf: (event: DrawEvent) => EventContext;
  canStart: (table: number) => boolean;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
  onPick: (table: number) => void;
}) {
  const t = getDictionary(lang).draw;
  const { table, groups, playing } = slot;

  if (groups.length === 0 && playing.length === 0) {
    return (
      <li className="card flex min-h-14 items-center justify-between gap-3 bg-slate-50/60 px-4 py-2.5">
        <span className="text-sm font-black text-slate-500">
          {t.table(table)}
          <span className="ml-2 font-semibold text-slate-400">{t.tableOpen}</span>
        </span>
        {canStart(table) && (
          <button type="button" onClick={() => onPick(table)} className="btn btn-ghost btn-sm shrink-0">
            <PlusIcon className="size-4" />
            {t.startMatch}
          </button>
        )}
      </li>
    );
  }

  // 두 조가 한 테이블을 나눠 쓰면 경기 이름에 조를 붙입니다.
  const shared = groups.length > 1;
  const remaining = groups.flatMap(({ event, group }) => {
    const context = contextOf(event);
    return context.groupMatches(group).flatMap((match, index) => {
      const item = queued.get(match);
      if (!item) return [];
      const sides = (["a", "b"] as const).map((side) => {
        const { name, entry } = sideName(match, side, context, t);
        return { name, decided: Boolean(entry) };
      }) as [MatchSide, MatchSide];
      return [
        {
          event,
          match,
          sides,
          label: shared ? matchLabel(event, match, t) : t.matchNo(index + 1),
          note: item.absent ? t.notArrived : item.busy ? t.playerBusy : undefined,
        },
      ];
    });
  });
  const title =
    groups.length > 0
      ? groups.map(({ event, group }) => `${eventName(event, lang)} ${t.group(groupLetter(group))}`).join(", ")
      : eventName(playing[0].event, lang);

  return (
    <li className={`card overflow-hidden ${playing.length > 0 ? "border-accent-200" : ""}`}>
      <div
        className={`flex flex-wrap items-baseline justify-between gap-x-2 px-3.5 py-2 text-sm font-black ${
          playing.length > 0 ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-900"
        }`}
      >
        <span className="shrink-0">{t.table(table)}</span>
        <span className="text-xs font-bold break-keep">{title}</span>
      </div>

      {playing.map(({ event, match }) => (
        <div key={`${event.id}:${match.id}`} className="border-b border-slate-100 last:border-0">
          <MatchLine
            event={event}
            match={match}
            context={contextOf(event)}
            t={t}
            onOpen={onOpen}
            label={`${t.state.playing} · ${matchLabel(event, match, t)}`}
            chip={false}
            compact
          />
        </div>
      ))}

      {remaining.length > 0 && (
        <div className="bg-slate-50/40 pb-1.5">
          <p className="px-3.5 pt-2.5 pb-1 text-xs font-bold text-slate-500">{t.remaining(remaining.length)}</p>
          <ul>
            {remaining.map(({ event, match, sides, label, note }) => (
              <li key={`${event.id}:${match.id}`}>
                <button
                  type="button"
                  onClick={() => onOpen(event, match)}
                  title={note}
                  className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left transition-colors hover:bg-brand-50/60"
                >
                  <span className={`shrink-0 text-xs font-bold break-keep text-slate-400 ${shared ? "w-16" : "w-12"}`}>
                    {label}
                  </span>
                  <span className={`min-w-0 flex-1 ${note ? "opacity-45" : ""}`}>
                    <MatchSides sides={sides} versus={t.versus} size="compact" row />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

// ───────────────────────── 종목 (조별 리그 + 본선) ─────────────────────────

function EventView({
  lang,
  event,
  context,
  board,
  onOpen,
}: {
  lang: Locale;
  event: DrawEvent;
  context: EventContext;
  board: TableBoard;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
}) {
  const t = getDictionary(lang).draw;
  const top = podium(context);
  const knockout = event.matches.filter((m) => m.stage === "knockout");
  const name = (id?: string) => {
    const entry = id ? context.entryById.get(id) : undefined;
    return entry ? entryName(entry) : "";
  };

  return (
    <div className="space-y-10">
      <p className="text-sm font-semibold text-slate-500">
        {eventName(event, lang)} · {t.bestOf(event.bestOf)}
      </p>

      {top && (
        <section className="card grid gap-px overflow-hidden bg-slate-200 sm:grid-cols-3">
          {[
            { label: t.podium.champion, names: [name(top.first)], strong: true },
            { label: top.league ? t.podium.second : t.podium.runnerUp, names: [name(top.second)] },
            {
              label: top.league || top.thirds.length < 2 ? t.podium.third : t.podium.jointThird,
              names: top.thirds.map(name),
            },
          ].map(({ label, names, strong }) => (
            <div key={label} className="bg-white px-5 py-4">
              <p className={`text-xs font-bold ${strong ? "text-accent-600" : "text-slate-500"}`}>{label}</p>
              {names.filter(Boolean).length > 0 ? (
                names.filter(Boolean).map((n) => (
                  <p key={n} className={`mt-1 break-keep ${strong ? "text-lg font-black text-brand-950" : "font-bold text-slate-800"}`}>
                    {n}
                  </p>
                ))
              ) : (
                <p className="mt-1 text-slate-300">–</p>
              )}
            </div>
          ))}
        </section>
      )}

      <section aria-labelledby={`${event.id}-groups`}>
        <h2 id={`${event.id}-groups`} className="text-xl font-black text-brand-950">
          {event.groups.length > 1 ? t.groupStage : eventName(event, lang)}
        </h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {event.groups.map((_, group) => (
            <GroupCard
              key={group}
              lang={lang}
              event={event}
              group={group}
              context={context}
              board={board}
              onOpen={onOpen}
            />
          ))}
        </div>
      </section>

      {knockout.length > 0 && (
        <section aria-labelledby={`${event.id}-knockout`}>
          <h2 id={`${event.id}-knockout`} className="text-xl font-black text-brand-950">{t.knockout}</h2>
          <Bracket lang={lang} event={event} context={context} board={board} onOpen={onOpen} />
        </section>
      )}
    </div>
  );
}

function GroupCard({
  lang,
  event,
  group,
  context,
  board,
  onOpen,
}: {
  lang: Locale;
  event: DrawEvent;
  group: number;
  context: EventContext;
  board: TableBoard;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
}) {
  const t = getDictionary(lang).draw;
  const rows = context.standings(group);
  const table = board.groupTable(event, group);
  const complete = context.groupComplete(group);
  const matches = context.groupMatches(group);
  const advancing = event.groups.length > 1;

  return (
    <article className="card overflow-hidden">
      <h3 className="flex flex-wrap items-baseline justify-between gap-x-2 bg-brand-50 px-4 py-2.5 font-black text-brand-900">
        {t.group(groupLetter(group))}
        {table && !complete && <span className="text-xs font-bold text-brand-700">{t.table(table)}</span>}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th scope="col" className="w-12 py-2 text-center font-bold">{t.rank}</th>
            <th scope="col" className="py-2 text-left font-bold">{t.entryHeading(event.doubles)}</th>
            <th scope="col" className="w-16 py-2 text-center font-bold">{t.record}</th>
            <th scope="col" className="w-16 py-2 pr-3 text-center font-bold">{t.games}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const entry = context.entryById.get(row.entry);
            const through = complete && advancing && row.rank <= event.advance;
            return (
              <tr key={row.entry} className="border-b border-slate-100 last:border-0">
                <td className="py-2.5 text-center font-black text-brand-700 tabular-nums">
                  {row.played > 0 || complete ? row.rank : "–"}
                </td>
                <td className="py-2.5 pr-2">
                  <span className="font-semibold break-keep text-slate-800">{entry ? entryName(entry) : "?"}</span>
                  {through && (
                    <span className="ml-1.5 rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold text-accent-700">
                      {t.advances}
                    </span>
                  )}
                  {entry?.absent === "forfeit" && (
                    <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-500">
                      {t.withdrawn}
                    </span>
                  )}
                  {entry?.club && <span className="block text-xs text-slate-400">{entry.club}</span>}
                </td>
                <td className="py-2.5 text-center text-slate-700 tabular-nums">{row.wins}-{row.losses}</td>
                <td className="py-2.5 pr-3 text-center text-slate-500 tabular-nums">
                  {row.setsWon}:{row.setsLost}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!complete && rows.some((row) => row.played > 0) && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">{t.provisional}</p>
      )}
      <ul className="divide-y divide-slate-100 border-t border-slate-200 bg-slate-50/40">
        {matches.map((match, index) => (
          <li key={match.id}>
            <MatchLine
              event={event}
              match={match}
              context={context}
              t={t}
              onOpen={onOpen}
              label={t.matchNo(index + 1)}
              table={board.tableOf(match)}
            />
          </li>
        ))}
      </ul>
    </article>
  );
}

/** 본선 대진표. 라운드를 왼쪽에서 오른쪽으로 놓고, 화면이 좁으면 옆으로 밀어서 봅니다. */
function Bracket({
  lang,
  event,
  context,
  board,
  onOpen,
}: {
  lang: Locale;
  event: DrawEvent;
  context: EventContext;
  board: TableBoard;
  onOpen: (event: DrawEvent, match: DrawMatch) => void;
}) {
  const t = getDictionary(lang).draw;
  const knockout = event.matches.filter((m) => m.stage === "knockout");
  const rounds = Math.max(...knockout.map((m) => m.round)) + 1;
  const firstCount = knockout.filter((m) => m.round === 0).length;
  const BOX = 92;

  return (
    <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2">
      <div className="flex gap-4" style={{ minWidth: rounds * 236 }}>
        {Array.from({ length: rounds }, (_, round) => {
          const matches = knockout.filter((m) => m.round === round);
          return (
            <div key={round} className="w-[220px] shrink-0">
              <p className="mb-2 text-center text-sm font-black text-brand-800">
                {t.round(roundSize(event, round))}
              </p>
              <ol className="flex flex-col justify-around" style={{ height: firstCount * BOX }}>
                {matches.map((match) => {
                  const bye = isByeMatch(match);
                  const state = context.stateOf(match);
                  const winner = winnerOf(match, event.bestOf);
                  const clickable = !bye && state !== "pending";
                  const table = state === "playing" ? board.tableOf(match) : undefined;
                  return (
                    <li key={match.id}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => onOpen(event, match)}
                        className={`w-full overflow-hidden rounded-xl border text-left text-sm transition-colors enabled:hover:border-brand-300 disabled:cursor-default ${
                          state === "playing"
                            ? "border-accent-300 ring-2 ring-accent-100"
                            : bye
                              ? "border-dashed border-slate-200 bg-slate-50/60"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        {(["a", "b"] as const).map((side, i) => {
                          const { name, entry } = sideName(match, side, context, t);
                          const isBye = "bye" in match[side];
                          return (
                            <span
                              key={side}
                              className={`flex items-center gap-2 px-3 py-1.5 ${i === 1 ? "border-t border-slate-100" : ""}`}
                            >
                              <span
                                className={`min-w-0 flex-1 truncate ${
                                  isBye || !entry
                                    ? "text-slate-400 italic"
                                    : winner === side
                                      ? "font-black text-brand-950"
                                      : winner
                                        ? "text-slate-500"
                                        : "font-semibold text-slate-800"
                                }`}
                                title={name}
                              >
                                {name}
                              </span>
                              <span className="w-4 text-right font-black text-brand-800 tabular-nums">
                                {match.walkover ? (match.walkover === side ? "W" : "") : (match.sets?.[i] ?? "")}
                              </span>
                            </span>
                          );
                        })}
                        {table && (
                          <span className="block bg-accent-50 px-3 py-0.5 text-[11px] font-bold text-accent-700">
                            {t.table(table)}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── 입력 기록 (관리자) ─────────────────────────

function LogView({
  lang,
  draw,
  contextOf,
}: {
  lang: Locale;
  draw: Draw;
  contextOf: (event: DrawEvent) => EventContext;
}) {
  const t = getDictionary(lang).draw;
  const items = draw.log.slice(0, 200);
  if (items.length === 0) return <p className="text-sm text-slate-500">아직 입력한 점수가 없습니다.</p>;
  return (
    <ol className="card divide-y divide-slate-100 overflow-hidden text-sm">
      {items.map((item, index) => {
        const event = draw.events.find((e) => e.id === item.event);
        const match = event?.matches.find((m) => m.id === item.match);
        if (!event || !match) return null;
        const context = contextOf(event);
        const [a, b] = [sideName(match, "a", context, t).name, sideName(match, "b", context, t).name];
        const result = item.cleared
          ? "결과 지움"
          : item.walkover
            ? `${item.walkover === "a" ? b : a} 기권`
            : item.sets
              ? `${item.sets[0]} : ${item.sets[1]}`
              : "";
        return (
          <li key={index} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2.5">
            <span className="w-20 shrink-0 text-slate-400 tabular-nums">{clockTime(item.at, lang, true)}</span>
            <span className="font-semibold text-slate-500">
              {eventName(event, lang)} · {matchLabel(event, match, t)}
            </span>
            <span className="min-w-0 flex-1 break-keep text-slate-800">
              {a} <span className="font-black text-brand-800">{result}</span> {b}
            </span>
            {item.admin && <span className="rounded bg-brand-50 px-1.5 text-xs font-bold text-brand-700">관리자</span>}
          </li>
        );
      })}
    </ol>
  );
}
