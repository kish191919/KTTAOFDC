"use client";

import { Fragment, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { entryName } from "@/lib/draw/entries";
import {
  eventContext,
  matchBestOf,
  tableBoard,
  winnerOf,
  withGroupTables,
  type EventContext,
  type MatchState,
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
import type { Draw, DrawEntry, DrawEvent, DrawMatch } from "@/lib/types";
import {
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  TrophyIcon,
} from "@/components/icons";
import { clockTime, eventName, formatLabel, matchLabel, pointsText, sideName, slotLabel } from "./labels";
import { MatchSides, type MatchSide } from "./MatchSides";
import { ScoreDialog } from "./ScoreDialog";
import { startableAt, TablePicker } from "./TablePicker";
import { useStored } from "./useStored";

type T = Dictionary["draw"];

/** 경기를 누르면 점수 입력 창을 엽니다. flip 은 b 쪽 팀을 왼쪽에 두고 보던 경기입니다. (창도 같은 순서로 그립니다) */
type OpenMatch = (event: DrawEvent, match: DrawMatch, flip?: boolean) => void;

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

type Opened = { event: string; match: string; flip: boolean };

/** 화면 위에 붙은 사이트 머리글(72px)과 탭 줄(약 57px)에 조금 띄운 높이. 탭을 바꾸면 내용의 처음을 여기에 맞춥니다. */
const STUCK_BOTTOM = 144;

/** 실시간 대진표 본 화면: 내 경기 찾기, 테이블 현황, 종목별 조 편성과 본선 대진표 */
export function DrawBoard({ tournamentId, lang, draw: saved, scoring, admin = false, onDraw, onRefresh }: Props) {
  const t = getDictionary(lang).draw;
  // 조 테이블을 아직 정하지 않은 대진표는 저장할 때와 똑같이 채워서 그립니다.
  const draw = useMemo(() => withGroupTables(saved), [saved]);
  const live = draw.events.filter((event) => event.status === "live");
  const contexts = useMemo(() => draw.events.map(eventContext), [draw]);
  const board = useMemo(() => tableBoard(draw, contexts), [draw, contexts]);
  const contextOf = (event: DrawEvent) => contexts[draw.events.indexOf(event)];

  /** 이 화면에서 고른 탭 */
  const [chosen, setChosen] = useState<string | null>(null);
  // 마지막으로 본 탭을 이 휴대폰에 기억해 두어, 새로 고치거나 다시 열어도 그 탭을 보여 줍니다.
  const [storedTab, storeTab] = useStored(`ktta-draw:${tournamentId}:tab`);
  const [opened, setOpened] = useState<Opened | null>(null);
  /** 경기를 고르고 있는 빈 테이블 */
  const [picking, setPicking] = useState<number | null>(null);
  /** 탭 아래 내용. 탭을 바꿀 때 그 처음으로 올라갑니다. */
  const content = useRef<HTMLDivElement>(null);

  if (live.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-12 text-center break-keep text-slate-500">
        {t.preparing}
      </p>
    );
  }

  const canScore = scoring || admin;
  const open: OpenMatch = (event, match, flip = false) => setOpened({ event: event.id, match: match.id, flip });
  const openedEvent = opened && draw.events.find((e) => e.id === opened.event);
  const openedMatch = openedEvent?.matches.find((m) => m.id === opened?.match);
  // 테이블이 없는 대회는 테이블 현황 탭 없이 첫 종목을 보여 줍니다.
  const tabs = [
    ...(draw.tables > 0 ? [{ id: "tables", label: t.tablesTab }] : []),
    ...live.map((event) => ({ id: event.id, label: eventName(event, lang) })),
    ...(admin ? [{ id: "log", label: "입력 기록" }] : []),
  ];
  // 고른 탭 → 기억해 둔 탭 → 첫 탭. 그 사이 없어진 탭(되돌린 종목, 관리자 탭)은 건너뜁니다.
  const tab = [chosen, storedTab].find((id) => tabs.some((item) => item.id === id)) ?? tabs[0].id;
  const current = live.find((event) => event.id === tab);

  function choose(id: string) {
    setChosen(id);
    storeTab(id);
    // 탭 줄이 화면 위에 붙을 만큼 내려와 있었으면, 새로 고른 내용의 처음으로 바로 올라갑니다. (탭 줄 밑으로 가려지지 않게)
    // 내용이 통째로 바뀌므로 사이트의 부드러운 스크롤 대신 한 번에 옮깁니다.
    const top = content.current?.getBoundingClientRect().top;
    if (!admin && top !== undefined && top < STUCK_BOTTOM) {
      window.scrollTo({ top: window.scrollY + top - STUCK_BOTTOM, behavior: "instant" });
    }
  }

  return (
    <div className="space-y-6">
      <EntryFinder
        tournamentId={tournamentId}
        lang={lang}
        live={live}
        contextOf={contextOf}
        board={board}
        canScore={canScore}
        onOpen={open}
      />

      {/* 방문자 화면에서는 탭 줄이 사이트 머리글(72px) 밑에 붙어 있어, 길게 내려 봐도 바로 다른 종목으로 옮길 수 있습니다.
          관리자 화면은 그 자리에 관리 메뉴가 붙으므로 붙이지 않습니다. 휴대폰에서는 한 줄로 두고 옆으로 밉니다. */}
      <div
        role="tablist"
        aria-label={t.viewsLabel}
        className={`flex gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible ${
          admin ? "" : "sticky top-[72px] z-30 -mx-4 border-b border-slate-100 bg-white/95 px-4 py-2.5 backdrop-blur-sm"
        }`}
      >
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => choose(item.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors sm:px-5 ${
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

      <div ref={content}>
        {current ? (
          <EventView
            lang={lang}
            event={current}
            context={contextOf(current)}
            board={board}
            canScore={canScore}
            onOpen={open}
          />
        ) : tab === "log" ? (
          <LogView lang={lang} draw={draw} contextOf={contextOf} />
        ) : (
          <TablesView
            lang={lang}
            board={board}
            contextOf={contextOf}
            // 조 테이블은 지금 시작할 수 없는 경기만 남았어도 버튼을 둡니다. 고르기 창에서 까닭을 보여 줍니다.
            canStart={(table) =>
              (scoring || admin) &&
              (board.tables[table - 1].groups.length > 0 || startableAt(draw, board, contexts, table, admin).length > 0)
            }
            onOpen={open}
            onPick={setPicking}
          />
        )}
      </div>

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
          flip={opened?.flip}
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

/**
 * 설명 글을 접어 두는 '안내' 버튼. 화면이 글로 붐비지 않게 처음에는 닫혀 있고, 누르면 그 아래에 펼쳐집니다.
 * title 을 주면 제목 옆에 버튼을 둡니다.
 */
function Guide({ t, title, children }: { t: T; title?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {title}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
            open
              ? "border-brand-200 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          }`}
        >
          <InfoIcon className="size-3.5" />
          {t.guide}
          <ChevronDownIcon className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      <div id={panelId} hidden={!open} className="mt-3 rounded-xl bg-brand-50/60 px-4 py-3 text-sm break-keep text-slate-600">
        {children}
      </div>
    </>
  );
}

/** 점수를 입력할 수 있다는 표시. 누를 곳임을 알 수 있게 버튼처럼 그립니다. */
function ScoreChip({ t }: { t: T }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand-200 bg-white px-2.5 py-1 text-xs font-bold text-brand-700 shadow-xs">
      <PencilIcon className="size-3.5" />
      {t.enterScore}
    </span>
  );
}

/**
 * 경기 상태 표시. 경기 중이면 테이블 번호를 함께 적습니다.
 * scorable 이면 아직 시작하지 않은 경기에 점수 입력 표시를 둡니다. (경기 중이면 상태만 적어 한 줄을 지킵니다)
 */
function StateChip({ state, table, scorable = false, t }: { state: MatchState; table?: number; scorable?: boolean; t: T }) {
  if (state === "playing") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-bold text-accent-700 ring-1 ring-accent-200">
        <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
        {table ? t.table(table) : t.state.playing}
      </span>
    );
  }
  if (state === "ready" && scorable) return <ScoreChip t={t} />;
  // 끝난 경기는 글 대신 체크 표시만 둡니다. 게임 수로 끝난 것을 알 수 있고, 휴대폰에서 이름 칸이 넓어집니다.
  if (state === "done") {
    return (
      <span className="inline-flex shrink-0 text-slate-400">
        <CheckIcon className="size-4" />
        <span className="sr-only">{t.state.done}</span>
      </span>
    );
  }
  const style = state === "ready" ? "bg-brand-50 text-brand-700 ring-1 ring-brand-100" : "bg-slate-50 text-slate-400";
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
  compact = false,
}: {
  event: DrawEvent;
  match: DrawMatch;
  context: EventContext;
  t: T;
  onOpen: OpenMatch;
  label?: string;
  chip?: boolean;
  /** 테이블 카드처럼 좁은 칸에 넣을 때 */
  compact?: boolean;
}) {
  const state = context.stateOf(match);
  const winner = winnerOf(match, event);
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
      {/* 상태 칸 너비를 맞춰 두어 경기마다 이름 상자 너비가 같게 합니다. */}
      {chip && (
        <span className="flex min-w-[5.5rem] shrink-0 justify-end">
          <StateChip state={state} t={t} />
        </span>
      )}
    </button>
  );
}

// ───────────────────────── 내 경기 찾기 ─────────────────────────

const searchKey = (text: string) => text.replace(/\s+/g, "").toLowerCase();

/**
 * 이 휴대폰에 저장해 둔 '내 팀'. 종목과 선수 이름으로 기억합니다.
 * (참가자 id 는 관리자가 명단을 고치면 다른 팀을 가리킬 수 있어서)
 */
type SavedTeam = { event: string; players: string[] };
/** 저장해 둘 수 있는 팀 수 (여러 종목에 나가거나 가족 경기를 함께 볼 때) */
const MAX_SAVED = 4;
const teamKey = (players: string[]) => players.map(searchKey).sort().join("|");

function readSaved(text: string | null): SavedTeam[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value)
      ? value.filter(
          (item): item is SavedTeam =>
            typeof item?.event === "string" &&
            Array.isArray(item.players) &&
            item.players.every((name: unknown) => typeof name === "string"),
        )
      : [];
  } catch {
    return [];
  }
}

/**
 * 이름으로 팀을 찾아 지금 상태와 그 팀의 경기를 보여 줍니다. 경기 줄은 순위표에서 펼친 것과 같은 모양입니다.
 * 찾은 팀을 '내 팀으로 저장'하면 이 휴대폰에 기억해 두었다가, 이름을 적지 않은 동안 늘 보여 줍니다.
 */
function EntryFinder({
  tournamentId,
  lang,
  live,
  contextOf,
  board,
  canScore,
  onOpen,
}: {
  tournamentId: string;
  lang: Locale;
  live: DrawEvent[];
  contextOf: (event: DrawEvent) => EventContext;
  board: TableBoard;
  canScore: boolean;
  onOpen: OpenMatch;
}) {
  const t = getDictionary(lang).draw;
  const [query, setQuery] = useState("");
  const [savedText, storeSaved] = useStored(`ktta-draw:${tournamentId}:teams`);
  const saved = readSaved(savedText);
  const isSaved = (event: DrawEvent, entry: DrawEntry) =>
    saved.some((item) => item.event === event.id && teamKey(item.players) === teamKey(entry.players));

  function toggleSaved(event: DrawEvent, entry: DrawEntry) {
    const rest = saved.filter((item) => !(item.event === event.id && teamKey(item.players) === teamKey(entry.players)));
    const next = rest.length < saved.length ? rest : [...saved, { event: event.id, players: entry.players }].slice(-MAX_SAVED);
    storeSaved(next.length > 0 ? JSON.stringify(next) : null);
  }

  const key = searchKey(query);
  // 이름을 적었으면 찾은 팀, 아니면 저장해 둔 내 팀 (그 사이 명단에서 빠진 팀은 건너뜁니다)
  const shown = key
    ? live
        .flatMap((event) =>
          event.entries
            .filter((entry) => entry.players.some((p) => searchKey(p).includes(key)))
            .map((entry) => ({ event, entry })),
        )
        .slice(0, 8)
    : saved.flatMap((item) => {
        const event = live.find((e) => e.id === item.event);
        const entry = event?.entries.find((e) => teamKey(e.players) === teamKey(item.players));
        return event && entry ? [{ event, entry }] : [];
      });

  return (
    <section aria-labelledby="find-heading" className="card p-3 sm:p-5">
      {/* 휴대폰에서는 제목을 숨기고 검색 칸의 안내 글로 대신해 첫 화면을 아낍니다. */}
      <h2 id="find-heading" className="sr-only text-base font-black text-brand-950 sm:not-sr-only">
        {t.findTitle}
      </h2>
      <div className="relative sm:mt-3">
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
      {key && shown.length === 0 && <p className="mt-3 text-sm text-slate-500">{t.findEmpty}</p>}
      {shown.length > 0 && (
        <ul className="mt-3 space-y-3">
          {shown.map(({ event, entry }) => {
            const context = contextOf(event);
            const status = entryStatus(context, board, entry.id);
            const group = event.groups.findIndex((members) => members.includes(entry.id));
            const row = group >= 0 ? context.standings(group).find((r) => r.entry === entry.id) : undefined;
            // 이 참가자의 경기를 모두 보여 줍니다. 예선은 순서가 자유라 남은 경기 어느 것이든 칠 수 있습니다.
            const mine = event.matches.filter(
              (match) =>
                context.stateOf(match) !== "bye" &&
                context.participants(match).some((side) => "entry" in side && side.entry === entry.id),
            );
            const pinned = isSaved(event, entry);
            return (
              <li key={`${event.id}:${entry.id}`} className="overflow-hidden rounded-xl border border-brand-100 bg-brand-50/40">
                <div className="flex items-start justify-between gap-3 px-4 pt-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-accent-600">
                      {eventName(event, lang)}
                      {group >= 0 && ` · ${t.group(groupLetter(group))}`}
                      {row && row.played > 0 && ` · ${t.winLoss(row.wins, row.losses)}`}
                    </p>
                    <p className="mt-0.5 font-black break-keep text-brand-950">{entryName(entry)}</p>
                  </div>
                  <button
                    type="button"
                    aria-pressed={pinned}
                    aria-label={t.saveTeam}
                    onClick={() => toggleSaved(event, entry)}
                    className={`-mr-1 inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      pinned
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    <StarIcon className="size-3.5" fill={pinned ? "currentColor" : "none"} />
                    {pinned ? t.myTeam : t.saveTeam}
                  </button>
                </div>
                <StatusLine status={status} event={event} context={context} t={t} />
                {mine.length > 0 && (
                  <ul className={`${teamListGrid} border-t border-brand-100 bg-white`}>
                    {mine.map((match) => (
                      <li key={match.id} className="col-span-4 grid grid-cols-subgrid">
                        <TeamMatchRow
                          event={event}
                          match={match}
                          context={context}
                          t={t}
                          onOpen={onOpen}
                          team={entry.id}
                          label={match.stage === "knockout" ? matchLabel(event, match, t) : undefined}
                          table={board.tableOf(match)}
                          scorable={canScore}
                          points
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** 내 경기 찾기의 지금 상태 한두 줄. 경기 목록은 그 아래에 따로 보여 줍니다. */
function StatusLine({
  status,
  event,
  context,
  t,
}: {
  status: EntryStatus;
  event: DrawEvent;
  context: EventContext;
  t: T;
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
          : status.tables
            ? t.status.nextAt(t.tables(status.tables))
            : t.status.nextFree;
      return (
        <div className="px-4 pt-1.5 pb-3">
          <p
            className={`text-sm font-bold break-keep ${
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
            <p className="mt-1 text-xs break-keep text-accent-700">{t.status.checkInFirst}</p>
          )}
        </div>
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
  /** 경기가 없는 테이블에 칠 경기를 고르는 버튼을 둘지 (점수 입력을 할 수 있을 때만) */
  canStart: (table: number) => boolean;
  onOpen: OpenMatch;
  onPick: (table: number) => void;
}) {
  const t = getDictionary(lang).draw;
  const queued = new Set(board.queue.map((item) => item.match));
  const hasGroups = board.tables.some((slot) => slot.groups.length > 0);
  // 테이블을 둘 이상 쓰는 조 (4팀 조)
  const shared = board.tables.some((slot) =>
    slot.groups.some(({ event, group }) => board.groupTables(event, group).length > 1),
  );

  return (
    <div className="space-y-8">
      <section aria-label={t.tablesTab}>
        {hasGroups && (
          <div className="mb-3">
            <Guide t={t}>
              {t.groupTableHint}
              {shared && ` ${t.sharedTableHint}`}
            </Guide>
          </div>
        )}
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
 * 테이블 카드 하나. 이 테이블에서 경기 중인 경기만 보여 줍니다.
 * 경기가 없는 조 테이블은 남은 경기 수와, 그 조에서 칠 경기를 고르는 버튼을 둡니다.
 * 맡은 조가 없고 경기도 없으면 한 줄짜리 빈 테이블 카드입니다.
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
  queued: Set<DrawMatch>;
  contextOf: (event: DrawEvent) => EventContext;
  canStart: (table: number) => boolean;
  onOpen: OpenMatch;
  onPick: (table: number) => void;
}) {
  const t = getDictionary(lang).draw;
  const { table, groups, playing } = slot;
  const startButton = canStart(table) && (
    <button type="button" onClick={() => onPick(table)} className="btn btn-ghost btn-sm shrink-0">
      <PlusIcon className="size-4" />
      {t.startMatch}
    </button>
  );

  if (groups.length === 0 && playing.length === 0) {
    return (
      <li className="card flex min-h-14 items-center justify-between gap-3 bg-slate-50/60 px-4 py-2.5">
        <span className="text-sm font-black text-slate-500">
          {t.table(table)}
          <span className="ml-2 font-semibold text-slate-400">{t.tableOpen}</span>
        </span>
        {startButton}
      </li>
    );
  }

  const remaining = groups.reduce(
    (n, { event, group }) => n + contextOf(event).groupMatches(group).filter((match) => queued.has(match)).length,
    0,
  );
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

      {playing.length > 0 ? (
        playing.map(({ event, match }) => (
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
        ))
      ) : (
        <div className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2">
          <span className="text-xs font-bold text-slate-500">{t.remaining(remaining)}</span>
          {startButton}
        </div>
      )}
    </li>
  );
}

// ───────────────────────── 종목 (조별 예선 + 본선) ─────────────────────────

/** 단계 제목. 처음 보는 사람을 위한 진행 방식 설명은 제목 옆 '안내' 버튼을 눌러야 펼쳐집니다. */
function StageHeading({
  id,
  step,
  title,
  hint,
  action,
  t,
}: {
  id: string;
  /** 예선 → 본선처럼 단계가 둘 이상일 때의 차례 */
  step?: number;
  title: string;
  hint: string;
  /** 점수 입력 안내 (점수를 입력할 수 있을 때만) */
  action?: string;
  t: T;
}) {
  return (
    <Guide
      t={t}
      title={
        <h2 id={id} className="flex items-center gap-2.5 text-xl font-black text-brand-950">
          {step !== undefined && (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm text-white tabular-nums">
              {step}
            </span>
          )}
          {title}
        </h2>
      }
    >
      <p>{hint}</p>
      {action && (
        <p className="mt-1.5 flex items-center gap-1.5 font-semibold text-brand-700">
          <PencilIcon className="size-4 shrink-0" />
          {action}
        </p>
      )}
    </Guide>
  );
}

function EventView({
  lang,
  event,
  context,
  board,
  canScore,
  onOpen,
}: {
  lang: Locale;
  event: DrawEvent;
  context: EventContext;
  board: TableBoard;
  canScore: boolean;
  onOpen: OpenMatch;
}) {
  const t = getDictionary(lang).draw;
  const top = podium(context);
  const knockout = event.matches.filter((m) => m.stage === "knockout");
  // 조가 둘 이상이면 예선 → 본선 두 단계, 조가 하나면 리그로 끝납니다.
  const staged = knockout.length > 0;
  const name = (id?: string) => {
    const entry = id ? context.entryById.get(id) : undefined;
    return entry ? entryName(entry) : "";
  };

  return (
    <div className="space-y-10">
      <p className="text-sm font-semibold text-slate-500">
        {eventName(event, lang)} · {formatLabel(event, t)}
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
        <StageHeading
          id={`${event.id}-groups`}
          step={staged ? 1 : undefined}
          title={staged ? t.groupStage : eventName(event, lang)}
          hint={`${staged ? t.groupStageHint(event.advance) : t.leagueHint} ${t.rankingRule} ${t.provisional}`}
          action={canScore ? t.tapTeamToScore : undefined}
          t={t}
        />
        <div className="mt-4 grid items-start gap-5 lg:grid-cols-2">
          {event.groups.map((_, group) => (
            <GroupCard
              // 종목 탭을 바꿔도 다른 종목의 같은 조가 펼침 상태를 이어받지 않게 종목까지 key 에 넣습니다.
              key={`${event.id}:${group}`}
              lang={lang}
              event={event}
              group={group}
              context={context}
              board={board}
              canScore={canScore}
              onOpen={onOpen}
            />
          ))}
        </div>
      </section>

      {staged && (
        <section aria-labelledby={`${event.id}-knockout`}>
          <StageHeading
            id={`${event.id}-knockout`}
            step={2}
            title={t.knockout}
            hint={t.knockoutHint}
            action={canScore ? t.tapToScore : undefined}
            t={t}
          />
          <Bracket lang={lang} event={event} context={context} board={board} canScore={canScore} onOpen={onOpen} />
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
  canScore,
  onOpen,
}: {
  lang: Locale;
  event: DrawEvent;
  group: number;
  context: EventContext;
  board: TableBoard;
  canScore: boolean;
  onOpen: OpenMatch;
}) {
  const t = getDictionary(lang).draw;
  const rows = context.standings(group);
  const tables = board.groupTables(event, group);
  const complete = context.groupComplete(group);
  const advancing = event.groups.length > 1;
  /** 순위표에서 눌러 경기를 펼친 팀 */
  const [selected, setSelected] = useState<string | null>(null);
  const panelId = useId();
  // 조 편성 순서. 펼친 팀의 경기를 상대의 이 순서로 적어, 순위가 바뀌어도 줄이 흔들리지 않게 합니다.
  const seats = event.groups[group];
  const seat = (id: string) => (seats.includes(id) ? seats.indexOf(id) : seats.length);
  const matches = context.groupMatches(group);
  /** 그 팀의 경기만, 상대의 조 편성 순서로 */
  const teamMatches = (id: string) =>
    matches
      .flatMap((match) => {
        const pair = context.pairOf(match);
        return pair?.includes(id) ? [{ match, other: pair[0] === id ? pair[1] : pair[0] }] : [];
      })
      .sort((x, y) => seat(x.other) - seat(y.other));
  // 조 테이블에서 경기 중인지. 다른 테이블로 옮겨 치는 경기는 그 줄에 테이블 번호로 따로 적습니다.
  const playing = matches.some((match) => {
    const at = board.tableOf(match);
    return context.stateOf(match) === "playing" && at !== undefined && tables.includes(at);
  });

  return (
    <article className="card overflow-hidden">
      {/* 조 이름과 이 조가 쓰는 테이블. 그 테이블에서 경기 중이면 빨간 점이 깜박입니다. */}
      <div className="flex items-center justify-between gap-3 bg-brand-50 px-4 py-2.5">
        <h3 className="font-black text-brand-900">{t.group(groupLetter(group))}</h3>
        {tables.length > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold ${
              playing ? "text-accent-700" : "text-brand-700"
            }`}
          >
            {playing && <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />}
            {t.tables(tables)}
          </span>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs text-slate-500">
            <th scope="col" className="w-11 py-2 text-center font-bold">{t.rank}</th>
            <th scope="col" className="py-2 text-left font-bold">{t.entryHeading(event.doubles)}</th>
            <th scope="col" className="w-16 py-2 text-center font-bold">{t.record}</th>
            <th scope="col" className="w-18 py-2 text-center font-bold">{t.games}</th>
            <th scope="col" className="w-9" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const entry = context.entryById.get(row.entry);
            const through = complete && advancing && row.rank <= event.advance;
            const expanded = selected === row.entry;
            const teamPanel = `${panelId}-${row.entry}`;
            return (
              <Fragment key={row.entry}>
                {/* 줄 어디를 눌러도 그 팀의 경기가 펼쳐지게 클릭은 줄이 받습니다.
                    이름 버튼은 키보드·화면 낭독기용이고, 버튼을 눌러도 클릭이 줄로 올라가 한 번만 열고 닫힙니다. */}
                <tr
                  onClick={() => setSelected(expanded ? null : row.entry)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors last:border-0 ${
                    expanded ? "bg-brand-50/70" : "hover:bg-brand-50/40"
                  }`}
                >
                  <td className="py-2.5 text-center font-black text-brand-700 tabular-nums">
                    {row.played > 0 || complete ? row.rank : "–"}
                  </td>
                  <td className="py-2.5 pr-2">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={teamPanel}
                      className={`text-left font-semibold break-keep ${expanded ? "text-brand-800" : "text-slate-800"}`}
                    >
                      {entry ? entryName(entry) : "?"}
                    </button>
                    {through && (
                      <span className="ml-1.5 inline-block rounded bg-accent-50 px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-accent-700">
                        {t.advances}
                      </span>
                    )}
                    {entry?.absent === "forfeit" && (
                      <span className="ml-1.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-slate-500">
                        {t.withdrawn}
                      </span>
                    )}
                    {entry?.club && <span className="block text-xs text-slate-400">{entry.club}</span>}
                  </td>
                  <td className="py-2.5 text-center whitespace-nowrap text-slate-700 tabular-nums">
                    {t.winLoss(row.wins, row.losses)}
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
                {/* 그 팀의 경기만: 끝난 경기와 남은 경기를 상대의 조 편성 순서로, 그 팀을 왼쪽에 둡니다. */}
                {expanded && (
                  <tr id={teamPanel} className="border-b border-slate-100 bg-brand-50/70 last:border-0">
                    {/* 휴대폰에서는 이름 칸이 좁아 안쪽 여백 없이 카드 너비를 다 씁니다. */}
                    <td colSpan={5} className="p-0 sm:px-3 sm:pb-3">
                      <ul className={`${teamListGrid} overflow-hidden border-y border-brand-100 bg-white sm:rounded-lg sm:border`}>
                        {teamMatches(row.entry).map(({ match }) => {
                          const at = board.tableOf(match);
                          return (
                            <li key={match.id} className="col-span-4 grid grid-cols-subgrid">
                              <TeamMatchRow
                                event={event}
                                match={match}
                                context={context}
                                t={t}
                                onOpen={onOpen}
                                team={row.entry}
                                // 조 테이블이 하나면 제목 줄에 있으니, 다른 테이블로 옮겨 칠 때만 적습니다.
                                // 테이블을 둘 쓰는 조는 어느 테이블인지 늘 적습니다.
                                table={tables.length === 1 && at === tables[0] ? undefined : at}
                                scorable={canScore}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

/** 팀 경기 목록(TeamMatchRow 를 담는 ul). 줄마다 칸 너비를 같게 하려고 목록 전체를 한 격자로 두고 줄은 subgrid 로 그 칸을 나눠 씁니다. */
const teamListGrid = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-x-2 divide-y divide-slate-100 sm:gap-x-3";

/**
 * 한 팀의 경기 한 줄 "김홍렬 · 구옥남  3 vs 0  김맥스 · 임용석  ✓". 순위표에서 펼친 팀과 내 경기 찾기가 함께 씁니다.
 * 그 팀을 늘 굵게 왼쪽에 두고, 이겼으면 초록 · 졌으면 옅은 빨강으로 칠합니다. 상대는 승패와 상관없이 보통 굵기입니다.
 * 누르면 점수 입력 창이 같은 좌우 순서로 열립니다.
 */
function TeamMatchRow({
  event,
  match,
  context,
  t,
  onOpen,
  team,
  label,
  table,
  scorable,
  points = false,
}: {
  event: DrawEvent;
  match: DrawMatch;
  context: EventContext;
  t: T;
  onOpen: OpenMatch;
  /** 왼쪽에 둘 팀. b 쪽이면 좌우를 바꿔 그립니다. */
  team: string;
  /** 줄 위에 적는 경기 이름 (본선 "준결승 1경기") */
  label?: string;
  /** 상태 표시에 적는 경기 중인 테이블 */
  table?: number;
  scorable: boolean;
  /** 게임별 점수를 줄 아래에 적을지 */
  points?: boolean;
}) {
  const state = context.stateOf(match);
  const winner = winnerOf(match, event);
  const sides = (["a", "b"] as const).map((side, i) => {
    const { name, entry } = sideName(match, side, context, t);
    return {
      name,
      decided: Boolean(entry),
      score: match.walkover ? (match.walkover === side ? "W" : "–") : match.sets?.[i],
      won: winner === side,
    };
  });
  // 본선은 상대가 정해지기 전에도 그 팀의 자리는 정해져 있습니다.
  const right = context.participants(match)[1];
  const flip = "entry" in right && right.entry === team;
  const [a, b] = flip ? [sides[1], sides[0]] : sides;
  const teamStyle = a.won ? "text-emerald-600" : winner ? "text-accent-400" : "text-brand-950";
  const clickable = state !== "pending" && state !== "bye";

  return (
    <button
      type="button"
      onClick={() => clickable && onOpen(event, match, flip)}
      disabled={!clickable}
      className="col-span-4 grid grid-cols-subgrid items-center gap-y-1 px-3 py-2.5 text-left text-sm transition-colors enabled:hover:bg-brand-50/60 disabled:cursor-default sm:px-4"
    >
      {label && <span className="col-span-4 text-xs font-bold text-slate-400">{label}</span>}
      <span className={`font-black break-keep ${teamStyle}`}>{a.name}</span>
      <span className="flex items-center gap-1.5 font-black text-slate-700 tabular-nums">
        <span className="w-4 text-right">{a.score}</span>
        <span className="text-[11px] text-slate-400">{t.versus}</span>
        <span className="w-4">{b.score}</span>
      </span>
      <span className={`break-keep ${b.decided ? "text-slate-600" : "text-slate-400 italic"}`}>{b.name}</span>
      <span className="flex justify-end">
        <StateChip state={state} table={table} scorable={scorable} t={t} />
      </span>
      {points && match.points && match.points.length > 0 && (
        <span className="col-span-4 text-xs text-slate-400 tabular-nums">{pointsText(match, flip)}</span>
      )}
    </button>
  );
}

/**
 * 본선 대진표. 넓은 화면에서는 라운드를 왼쪽에서 오른쪽으로 놓고 선으로 이어, 맨 끝에 우승 칸을 둡니다.
 * 멀리서도 잘 보이게 글자를 키우고, 라운드 칸이 화면 너비를 나눠 쓰며, 모자라면 옆으로 밀어서 봅니다.
 * 휴대폰에서는 대진표 전체가 화면 서너 개 너비라서, 라운드를 골라 그 라운드의 경기만 세로로 봅니다. (KnockoutRounds)
 */
function Bracket({
  lang,
  event,
  context,
  board,
  canScore,
  onOpen,
}: {
  lang: Locale;
  event: DrawEvent;
  context: EventContext;
  board: TableBoard;
  canScore: boolean;
  onOpen: OpenMatch;
}) {
  const t = getDictionary(lang).draw;
  const knockout = event.matches.filter((m) => m.stage === "knockout");
  const rounds = Math.max(...knockout.map((m) => m.round)) + 1;
  const final = knockout.find((m) => m.round === rounds - 1);
  const champion = final && winnerOf(final, event);
  const roundMatches = (round: number) =>
    knockout.filter((m) => m.round === round).sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
  // 본선 방식을 따로 정한 종목은 라운드마다 경기 방식을 적습니다.
  const formatOf = (round: number) => {
    const first = roundMatches(round)[0];
    return event.knockoutBestOf && first ? t.bestOf(matchBestOf(event, first)) : undefined;
  };
  const matchBox = (match: DrawMatch) => (
    <BracketMatch event={event} match={match} context={context} board={board} canScore={canScore} t={t} onOpen={onOpen} />
  );
  const championBox = final && (
    <div
      className={`w-full rounded-xl border px-4 py-4 text-center lg:px-5 ${
        champion ? "border-accent-200 bg-accent-50 shadow-sm" : "border-dashed border-slate-200 bg-white"
      }`}
    >
      <TrophyIcon className={`mx-auto size-7 lg:size-8 ${champion ? "text-accent-500" : "text-slate-300"}`} />
      <p
        className={`mt-2 text-base break-keep lg:text-lg ${
          champion ? "font-black text-brand-950" : "font-medium text-slate-400"
        }`}
      >
        {champion ? sideName(final, champion, context, t).name : t.winnerOf(matchLabel(event, final, t))}
      </p>
    </div>
  );

  return (
    <>
      <KnockoutRounds
        event={event}
        context={context}
        rounds={rounds}
        roundMatches={roundMatches}
        formatOf={formatOf}
        matchBox={matchBox}
        championBox={championBox}
        t={t}
      />
      <div className="-mx-4 mt-6 hidden overflow-x-auto px-4 pb-3 md:block">
        {/* 이음선은 칸 사이 간격(gap-8)의 가운데에서 만나므로, 이음선 길이(w-4)는 간격의 절반입니다. */}
        <div className="flex gap-8">
          {Array.from({ length: rounds }, (_, round) => (
            <div key={round} className="flex max-w-[400px] min-w-[250px] flex-1 flex-col lg:min-w-[200px]">
              <RoundHeading title={t.round(roundSize(event, round))} sub={formatOf(round)} />
              {/* 라운드 칸은 높이가 같고 경기마다 같은 높이를 나눠 가져, 다음 라운드 경기가 앞 라운드 두 경기 사이에 옵니다.
                  첫 라운드 경기 칸의 최소 높이가 대진표 전체 높이를 정합니다. */}
              <ol className="flex flex-1 flex-col">
                {roundMatches(round).map((match, index) => (
                  <li key={match.id} className="relative flex min-h-40 flex-1 items-center lg:min-h-44">
                    {round > 0 && <Connector shape="in" on={context.stateOf(match) !== "pending"} />}
                    {matchBox(match)}
                    {/* 짝 경기(위·아래)와 이어 다음 라운드로, 결승은 우승 칸으로 곧게 나갑니다. */}
                    <Connector
                      shape={round === rounds - 1 ? "out" : index % 2 === 0 ? "down" : "up"}
                      on={Boolean(winnerOf(match, event))}
                    />
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {final && (
            // 우승 칸은 이름 하나만 적으므로 폭을 고정해, 남는 폭을 라운드 칸이 쓰게 합니다.
            <div className="flex w-[180px] shrink-0 flex-col lg:w-[200px]">
              <RoundHeading title={t.podium.champion} champion />
              <div className="relative flex flex-1 items-center">
                <Connector shape="in" on={Boolean(champion)} />
                {championBox}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * 휴대폰의 본선: 라운드 버튼을 눌러 그 라운드의 경기만 세로로 봅니다.
 * 처음에는 지금 치고 있는 라운드(끝나지 않은 경기가 남은 첫 라운드)를 보여 주고, 그 라운드가 끝나면 저절로 다음 라운드로 넘어갑니다.
 * 버튼을 누른 뒤에는 고른 라운드에 머뭅니다. 결승을 고르면 우승 칸도 함께 보입니다.
 */
function KnockoutRounds({
  event,
  context,
  rounds,
  roundMatches,
  formatOf,
  matchBox,
  championBox,
  t,
}: {
  event: DrawEvent;
  context: EventContext;
  rounds: number;
  roundMatches: (round: number) => DrawMatch[];
  formatOf: (round: number) => string | undefined;
  matchBox: (match: DrawMatch) => ReactNode;
  championBox: ReactNode;
  t: T;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const all = Array.from({ length: rounds }, (_, round) => round);
  const unfinished = (round: number) =>
    roundMatches(round).some((match) => !["done", "bye"].includes(context.stateOf(match)));
  const shown = picked ?? all.find(unfinished) ?? rounds - 1;
  const format = formatOf(shown);

  return (
    <div className="mt-5 md:hidden">
      <div role="group" aria-label={t.roundsLabel} className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {all.map((round) => {
          // 그 라운드에 경기 중인 경기가 있으면 빨간 점을 둡니다.
          const playing = roundMatches(round).some((match) => context.stateOf(match) === "playing");
          return (
            <button
              key={round}
              type="button"
              aria-pressed={round === shown}
              onClick={() => setPicked(round)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                round === shown ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-brand-700"
              }`}
            >
              {playing && <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />}
              {t.round(roundSize(event, round))}
            </button>
          );
        })}
      </div>
      {format && <p className="mt-3 text-center text-xs font-semibold text-slate-500">{format}</p>}
      <ol className="mt-4 space-y-3">
        {roundMatches(shown).map((match) => (
          <li key={match.id}>{matchBox(match)}</li>
        ))}
      </ol>
      {shown === rounds - 1 && championBox && <div className="mt-4">{championBox}</div>}
    </div>
  );
}

/** 대진표 라운드 제목 "준결승 · 5세트 3선승". 라운드마다 제목 높이가 같아야 이음선이 맞으므로 한 줄로 적습니다. */
function RoundHeading({ title, sub, champion = false }: { title: string; sub?: string; champion?: boolean }) {
  return (
    <p className="mb-4 text-center">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm whitespace-nowrap lg:text-base ${
          champion ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-800"
        }`}
      >
        {champion && <TrophyIcon className="size-4" />}
        <span className="font-black">{title}</span>
        {sub && <span className="text-xs font-semibold opacity-75 lg:text-sm">· {sub}</span>}
      </span>
    </p>
  );
}

/**
 * 대진표 칸을 잇는 선. in 은 왼쪽에서 들어오는 선, out 은 오른쪽으로 곧게 나가는 선이고,
 * down · up 은 오른쪽으로 나가 짝 경기 쪽으로 꺾여, 두 경기 사이(다음 라운드 경기의 높이)에서 짝의 선과 만납니다.
 * 결과가 나와 이긴 쪽이 지나간 선은 파랗게 칠합니다.
 */
function Connector({ shape, on }: { shape: "in" | "out" | "down" | "up"; on: boolean }) {
  // 2px 선이 칸의 한가운데를 지나도록 1px 씩 올려 둡니다.
  const position = {
    in: "-left-4 top-[calc(50%-1px)] border-t-2",
    out: "-right-4 top-[calc(50%-1px)] border-t-2",
    down: "-right-4 top-[calc(50%-1px)] bottom-0 rounded-tr-lg border-t-2 border-r-2",
    up: "-right-4 top-0 bottom-[calc(50%-1px)] rounded-br-lg border-r-2 border-b-2",
  }[shape];
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute w-4 ${position} ${on ? "border-brand-400" : "border-slate-200"}`}
    />
  );
}

/** 본선 경기 칸: 위에 경기 이름과 상태, 아래에 두 참가자와 이긴 세트 수. 누르면 점수 입력 창이 열립니다. */
function BracketMatch({
  event,
  match,
  context,
  board,
  canScore,
  t,
  onOpen,
}: {
  event: DrawEvent;
  match: DrawMatch;
  context: EventContext;
  board: TableBoard;
  canScore: boolean;
  t: T;
  onOpen: OpenMatch;
}) {
  const bye = isByeMatch(match);
  const state = context.stateOf(match);
  const winner = winnerOf(match, event);
  const playing = state === "playing";
  const table = playing ? board.tableOf(match) : undefined;
  const clickable = !bye && state !== "pending";

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onOpen(event, match)}
      className={`w-full overflow-hidden rounded-xl border text-left transition enabled:hover:border-brand-300 enabled:hover:shadow-md disabled:cursor-default ${
        playing
          ? "border-accent-300 bg-white ring-2 ring-accent-100"
          : bye
            ? "border-dashed border-slate-200 bg-slate-50/60"
            : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <span
        className={`flex items-center justify-between gap-2 border-b px-4 py-1.5 text-xs font-bold lg:px-5 lg:text-sm ${
          playing ? "border-accent-100 bg-accent-50" : "border-slate-100 bg-slate-50"
        }`}
      >
        <span className="truncate text-slate-500">{matchLabel(event, match, t)}</span>
        {/* 상대가 정해지기 전에는 비워 둡니다. (본선 첫 화면이 온통 '상대 결정 전'이 되지 않게)
            끝난 경기는 글 대신 체크 표시를 둡니다. (영어 'Final' 이 결승과 헷갈리지 않게) */}
        {playing ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-accent-700">
            <span className="size-1.5 animate-pulse rounded-full bg-accent-500" />
            {table ? t.table(table) : t.state.playing}
          </span>
        ) : state === "ready" && canScore ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-brand-700">
            <PencilIcon className="size-3.5" />
            {t.enterScore}
          </span>
        ) : state === "done" ? (
          <span className="shrink-0 text-slate-400">
            <CheckIcon className="size-4" />
            <span className="sr-only">{t.state.done}</span>
          </span>
        ) : (
          state !== "pending" && (
            <span className={`shrink-0 ${state === "ready" ? "text-brand-700" : "text-slate-400"}`}>
              {t.state[state]}
            </span>
          )
        )}
      </span>
      {(["a", "b"] as const).map((side, i) => {
        const { name, entry } = sideName(match, side, context, t);
        const won = winner === side;
        return (
          <span
            key={side}
            className={`flex items-center gap-2.5 px-4 py-2.5 lg:px-5 lg:py-3 ${i === 1 ? "border-t border-slate-100" : ""} ${
              won ? "bg-brand-50" : ""
            }`}
          >
            {/* 아직 정해지지 않은 자리("준결승 1경기 승자")는 점수 칸 없이 한 단계 작게 적어 긴 이름도 다 보이게 합니다.
                줄 높이(leading-7)는 점수 칸과 같게 두어 줄마다 높이가 같습니다. */}
            <span
              className={`min-w-0 flex-1 truncate ${
                !entry
                  ? "text-base leading-7 font-medium text-slate-400"
                  : won
                    ? "font-black text-brand-950"
                    : winner
                      ? "text-slate-400"
                      : "font-bold text-slate-800"
              } ${entry ? "text-base lg:text-lg" : ""}`}
              title={name}
            >
              {name}
            </span>
            {entry && (
              <span
                className={`w-7 shrink-0 text-right text-lg font-black tabular-nums lg:text-xl ${
                won ? "text-brand-700" : winner ? "text-slate-400" : "text-slate-700"
              }`}
            >
                {match.walkover ? (match.walkover === side ? "W" : "") : (match.sets?.[i] ?? "")}
              </span>
            )}
          </span>
        );
      })}
    </button>
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
