"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { drawAdminAction } from "@/lib/actions";
import type { DrawOp, EventSettings } from "@/lib/draw/admin";
import { entriesToText, entryName, parseEntries } from "@/lib/draw/entries";
import { eventContext, groupCapacity, winnerOf, withGroupTables } from "@/lib/draw/play";
import {
  arrivedPlayers,
  personKey,
  planStart,
  presence,
  rosterOf,
  teamOf,
  usesCheckIn,
} from "@/lib/draw/roster";
import { groupLetter, isByeMatch, type DrawPayload } from "@/lib/draw/view";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Draw, DrawEntry, DrawEvent, DrawPlayer } from "@/lib/types";
import { DrawBoard } from "@/components/draw/DrawBoard";
import { clockTime, formatLabel } from "@/components/draw/labels";
import { useLiveDraw } from "@/components/draw/useLiveDraw";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";

type Props = {
  tournamentId: string;
  initial: DrawPayload;
  renderedAt: string;
  /** 방문자용 실시간 대진표 주소 */
  publicHref: string;
  /** 접수 데스크용 체크인 화면 주소 */
  checkInHref: string;
};

/** 대진표를 바꾸고, 잘 되면 바뀐 대진표를 돌려줍니다. */
type Run = (op: DrawOp, notice?: string) => Promise<Draw | null>;
/** 다른 화면으로 갑니다. */
type Go = (view: string) => void;

// ───────────────────────── 화면 고르기 ─────────────────────────

/** 늘 있는 화면. 종목 화면은 종목 id 로 고릅니다. */
const VIEWS = ["play", "roster", "venue", "new"];

/** 주소에 고른 화면이 없으면 지금 할 일에 맞는 화면을 엽니다: 경기 중이면 경기 진행, 아니면 준비할 곳 */
function defaultView(draw: Draw): string {
  if (draw.events.some((event) => event.status === "live")) return "play";
  if (draw.events.length > 0) return draw.events[0].id;
  return rosterOf(draw).length === 0 ? "roster" : "new";
}

/** 주소의 ?tab= 을 화면으로 바꿉니다. 지운 종목처럼 없는 화면을 가리키면 기본 화면을 엽니다. */
function viewOf(draw: Draw, tab: string | null): string {
  if (tab && (VIEWS.includes(tab) || draw.events.some((event) => event.id === tab))) return tab;
  return defaultView(draw);
}

/** 윗부분이 머리글·메뉴 밑에 가려졌으면 보이도록 올립니다. (긴 명단을 내려 본 뒤 화면을 바꿀 때) */
function reveal(element: HTMLElement | null) {
  if (element && element.getBoundingClientRect().top < 140) element.scrollIntoView({ block: "start" });
}

/** 종목의 끝난 경기 수와 전체 경기 수 (부전승은 빼고 셉니다) */
function progressOf(event: DrawEvent) {
  const real = event.matches.filter((m) => !isByeMatch(m));
  return { done: real.filter((m) => winnerOf(m, event)).length, total: real.length };
}

/**
 * 관리자 화면의 대진표 관리. 왼쪽 메뉴(휴대폰은 위쪽 탭)에서 선수 명단, 대회장 설정, 종목, 경기 진행 가운데
 * 한 화면을 골라 봅니다. 종목 화면은 참가 팀 → 조 편성 → 대진 확정 단계로 나뉩니다.
 */
export function DrawManager({ tournamentId, initial, renderedAt, publicHref, checkInHref }: Props) {
  const { payload, online, checkedAt, refresh, setDraw } = useLiveDraw(tournamentId, initial);
  const draw = payload.draw;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const searchParams = useSearchParams();
  const view = viewOf(draw, searchParams.get("tab"));
  const panels = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLUListElement>(null);

  // 잘 됐다는 안내는 잠시 뒤 저절로 닫고, 잘못됐다는 안내는 닫을 때까지 둡니다.
  useEffect(() => {
    if (!message || message.error) return;
    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  // 휴대폰에서 옆으로 넘기는 메뉴는 고른 칸이 가운데 오도록 옮깁니다.
  useEffect(() => {
    const list = menu.current;
    const item = list?.querySelector<HTMLElement>("[aria-current='page']");
    if (!list || !item || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2, behavior: "smooth" });
  }, [view]);

  const run: Run = async (op, notice) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await drawAdminAction(tournamentId, op);
      if ("error" in result) {
        setMessage({ error: true, text: result.error });
        return null;
      }
      setDraw(result.draw);
      if (notice) setMessage({ error: false, text: notice });
      return result.draw;
    } catch {
      setMessage({ error: true, text: "저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요." });
      return null;
    } finally {
      setBusy(false);
    }
  };

  // 새로 고쳐도 같은 화면이 열리도록 주소의 ?tab= 에 적어 둡니다. (서버에 다시 묻지 않고 주소만 바꿉니다)
  const go: Go = (next) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    window.history.replaceState(null, "", `?${params.toString()}`);
    reveal(panels.current);
  };

  const live = draw.events.filter((event) => event.status === "live");
  const played = live.map(progressOf).reduce(
    (sum, p) => ({ done: sum.done + p.done, total: sum.total + p.total }),
    { done: 0, total: 0 },
  );
  const roster = rosterOf(draw);
  const checkIn = usesCheckIn(draw);
  const arrived = roster.filter((p) => p.checkedInAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${online ? "text-slate-500" : "font-bold text-accent-600"}`}>
          <span suppressHydrationWarning>
            {online
              ? `${clockTime(checkedAt ?? renderedAt, "ko", true)} 기준 · 5초마다 새로 고칩니다`
              : "연결이 끊겼습니다. 다시 연결하는 중입니다…"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {checkIn && (
            <a href={checkInHref} className="btn btn-brand btn-sm">
              <CheckIcon className="size-4" />
              체크인 화면
            </a>
          )}
          <a href={publicHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            방문자 화면 열기
            <ExternalLinkIcon className="size-4" />
          </a>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* 휴대폰: 머리글 밑에 붙는 가로 탭 / 넓은 화면: 왼쪽에 붙는 메뉴 */}
        <nav
          aria-label="대진표 관리 메뉴"
          className="sticky top-[72px] z-20 -mx-4 mb-5 border-b border-brand-100 bg-brand-50/95 px-4 py-2.5 backdrop-blur lg:top-24 lg:mx-0 lg:mb-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
        >
          <ul
            ref={menu}
            className="relative flex gap-2 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible"
          >
            <MenuHeading>대회 준비</MenuHeading>
            <MenuItem
              active={view === "roster"}
              onClick={() => go("roster")}
              label="선수 명단"
              count={roster.length}
              meta={checkIn ? `도착 ${arrived}명 · 아직 ${roster.length - arrived}명` : "체크인 안 씀"}
            />
            <MenuItem
              active={view === "venue"}
              onClick={() => go("venue")}
              label="대회장 설정"
              meta={`테이블 ${draw.tables}개 · 점수 입력 ${payload.scoring ? "열림" : "닫힘"}`}
            />

            <MenuHeading>종목</MenuHeading>
            {draw.events.map((event) => {
              const unit = event.doubles ? "팀" : "명";
              const { done, total } = progressOf(event);
              const playing = event.entries.filter((e) => e.absent !== "excluded").length;
              return (
                <MenuItem
                  key={event.id}
                  active={view === event.id}
                  onClick={() => go(event.id)}
                  label={event.name}
                  live={event.status === "live"}
                  meta={
                    event.status === "live"
                      ? `경기 중 · ${done}/${total} 끝남`
                      : `준비 중 · ${playing}${unit}${event.groups.length > 0 ? ` · ${event.groups.length}개 조` : ""}`
                  }
                />
              );
            })}
            <MenuItem
              active={view === "new"}
              onClick={() => go("new")}
              label="종목 추가"
              icon={<PlusIcon className="size-4 shrink-0" />}
            />

            {/* 경기 진행이 '종목 추가' 밑에 붙어 종목의 하나처럼 보이지 않도록 선으로 나눕니다. */}
            <li aria-hidden className="mx-3 my-4 hidden border-t border-slate-200 lg:block" />
            <MenuItem
              active={view === "play"}
              onClick={() => go("play")}
              label="경기 진행"
              live={live.length > 0}
              count={live.length > 0 ? `${played.done}/${played.total}` : undefined}
              meta={live.length > 0 ? `${live.length}개 종목 경기 중` : "대진을 확정하면 열립니다"}
            />
          </ul>
        </nav>

        {/* 고르지 않은 화면도 숨겨 둘 뿐 지우지 않아서, 적던 글이나 고른 값이 화면을 오가도 남습니다. */}
        <div ref={panels} className="min-w-0 scroll-mt-36 lg:scroll-mt-24">
          <div hidden={view !== "play"}>
            <PlayPanel
              tournamentId={tournamentId}
              draw={draw}
              scoring={payload.scoring}
              onDraw={setDraw}
              onRefresh={refresh}
              go={go}
            />
          </div>
          {draw.events.map((event) => (
            <div key={event.id} hidden={view !== event.id}>
              <EventPanel draw={draw} event={event} busy={busy} run={run} go={go} checkInHref={checkInHref} />
            </div>
          ))}
          <div hidden={view !== "new"}>
            <NewEventPanel draw={draw} busy={busy} run={run} go={go} />
          </div>
          <div hidden={view !== "roster"}>
            <RosterPanel draw={draw} busy={busy} run={run} />
          </div>
          <div hidden={view !== "venue"}>
            <VenuePanel draw={draw} scoring={payload.scoring} busy={busy} run={run} />
          </div>
        </div>
      </div>

      {message && (
        <div
          role={message.error ? "alert" : "status"}
          className={`fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-lg items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ring-1 ${
            message.error ? "bg-accent-50 text-accent-700 ring-accent-200" : "bg-brand-800 text-white ring-brand-900"
          }`}
        >
          {!message.error && <CheckIcon className="mt-0.5 size-4 shrink-0" />}
          <p className="min-w-0 flex-1 break-keep whitespace-pre-line">{message.text}</p>
          <button
            type="button"
            onClick={() => setMessage(null)}
            aria-label="안내 닫기"
            className="-m-1 rounded-lg p-1 opacity-70 hover:opacity-100"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 메뉴 ─────────────────────────

function MenuHeading({ children }: { children: ReactNode }) {
  return (
    <li aria-hidden className="hidden px-3 pt-5 pb-1 text-xs font-bold tracking-wide text-slate-400 first:pt-0 lg:block">
      {children}
    </li>
  );
}

function MenuItem({
  active,
  onClick,
  label,
  meta,
  count,
  live = false,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  /** 넓은 화면에서 이름 아래 작게 보여 주는 현황 */
  meta?: string;
  count?: number | string;
  /** 경기 중이면 빨간 점을 붙입니다. */
  live?: boolean;
  icon?: ReactNode;
}) {
  return (
    <li className="shrink-0">
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-full px-4 py-2 text-left text-sm font-semibold whitespace-nowrap transition-colors lg:rounded-xl lg:px-3 lg:py-2.5 lg:whitespace-normal ${
          active
            ? "bg-brand-700 text-white shadow-sm"
            : "border border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 lg:border-transparent lg:bg-transparent lg:hover:border-slate-200 lg:hover:bg-white"
        }`}
      >
        {icon}
        {live && (
          <span aria-hidden className={`size-2 shrink-0 rounded-full ${active ? "bg-white" : "bg-accent-500"}`} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block break-keep">
            {label}
            {live && <span className="sr-only"> (경기 중)</span>}
          </span>
          {meta && (
            <span className={`hidden text-xs font-medium lg:block ${active ? "text-brand-100" : "text-slate-500"}`}>
              {meta}
            </span>
          )}
        </span>
        {count !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
              active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {count}
          </span>
        )}
      </button>
    </li>
  );
}

/** 화면마다 맨 위에 두는 제목과 설명, 오른쪽 버튼 */
function PanelHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-black break-keep text-brand-950">{title}</h2>
        {description && <p className="mt-1 text-sm break-keep text-slate-500">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

// ───────────────────────── 경기 진행 ─────────────────────────

function PlayPanel({
  tournamentId,
  draw,
  scoring,
  onDraw,
  onRefresh,
  go,
}: {
  tournamentId: string;
  draw: Draw;
  scoring: boolean;
  onDraw: (draw: Draw) => void;
  onRefresh: () => void;
  go: Go;
}) {
  if (!draw.events.some((event) => event.status === "live")) {
    const first = draw.events[0];
    return (
      <section className="rounded-2xl border border-dashed border-brand-200 bg-white px-6 py-12 text-center">
        <h2 className="text-lg font-black text-brand-950">아직 경기를 시작한 종목이 없습니다</h2>
        <p className="mx-auto mt-2 max-w-md text-sm break-keep text-slate-500">
          종목에서 참가 팀과 조를 정하고 대진을 확정하면, 여기서 테이블 현황을 보고 점수를 고칠 수 있습니다.
        </p>
        <button
          type="button"
          onClick={() => go(first ? first.id : "new")}
          className="btn btn-ghost btn-sm mt-5"
        >
          {first ? "종목 준비하러 가기" : "종목 만들러 가기"}
          <ArrowRightIcon className="size-4" />
        </button>
      </section>
    );
  }
  return (
    <div className="space-y-5">
      <PanelHeader
        title="경기 진행"
        description="방문자 화면과 같습니다. 경기를 누르면 점수를 고치거나, 테이블을 옮기거나, 결과를 지울 수 있습니다."
      />
      <DrawBoard
        tournamentId={tournamentId}
        lang="ko"
        draw={draw}
        scoring={scoring}
        admin
        onDraw={onDraw}
        onRefresh={onRefresh}
      />
    </div>
  );
}

// ───────────────────────── 대회장 설정 ─────────────────────────

function VenuePanel({
  draw,
  scoring,
  busy,
  run,
}: {
  draw: Draw;
  scoring: boolean;
  busy: boolean;
  run: Run;
}) {
  const [tables, setTables] = useState(String(draw.tables));
  const [open, setOpen] = useState(draw.scoringOpen);
  const [checkIn, setCheckIn] = useState(usesCheckIn(draw));
  const changed = Number(tables) !== draw.tables || open !== draw.scoringOpen || checkIn !== usesCheckIn(draw);

  return (
    <div className="space-y-5">
      <PanelHeader title="대회장 설정" description="대회장의 테이블 수와 대회 날 운영 방식을 정합니다." />
      <form
        className="card divide-y divide-slate-100"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            { op: "settings", tables: Number(tables), scoringOpen: open, checkIn },
            "대회장 설정을 저장했습니다.",
          );
        }}
      >
        <div className="p-5 sm:p-6">
          <label htmlFor="venue-tables" className="label">
            테이블 수
          </label>
          <input
            id="venue-tables"
            type="number"
            min={0}
            max={40}
            value={tables}
            onChange={(e) => setTables(e.target.value)}
            className="field max-w-32"
          />
          <p className="hint break-keep">
            대진을 확정하면 조마다 테이블이 하나씩 정해지고, 조 안의 경기는 그 테이블에서 아무 순서로나 칩니다.
            남는 테이블은 본선 경기와 다른 경기에 씁니다. 0으로 두면 테이블 없이 진행합니다.
          </p>
        </div>
        <ToggleRow
          checked={checkIn}
          onChange={setCheckIn}
          title="체크인 사용"
          hint="대회 날 접수 데스크에서 선수 도착을 확인하고, 도착한 팀만으로 대진을 확정합니다."
        />
        <ToggleRow
          checked={open}
          onChange={setOpen}
          title="누구나 점수 입력"
          hint="체크를 풀면 관리자만 입력할 수 있습니다. 체크해 두어도 대회 다음 날이 지나면 저절로 막힙니다."
          status={
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                scoring ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "bg-accent-50 text-accent-700 ring-1 ring-accent-200"
              }`}
            >
              지금 {scoring ? "열림" : "닫힘"}
            </span>
          }
        />
        <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          <button type="submit" disabled={busy || !changed} className="btn btn-brand btn-sm">
            저장
          </button>
          {changed && <span className="text-sm text-slate-500">저장하지 않은 변경이 있습니다</span>}
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  hint,
  status,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  hint: string;
  status?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 p-5 hover:bg-brand-50/40 sm:p-6">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 accent-brand-700"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-800">
          {title}
          {status}
        </span>
        <span className="hint block break-keep">{hint}</span>
      </span>
    </label>
  );
}

// ───────────────────────── 선수 명단 ─────────────────────────

/** 선수가 나가는 종목과 짝 ("복식 U1000 · 임명숙") */
function entriesOf(draw: Draw, player: DrawPlayer) {
  return draw.events.flatMap((event) => {
    const entry = teamOf(event, player.name);
    if (!entry) return [];
    const partners = entry.players.filter((name) => personKey(name) !== personKey(player.name));
    return [{ event, entry, partners }];
  });
}

/** 도착 표시가 붙은 선수 이름 */
function PlayerName({ name, arrived, checkIn }: { name: string; arrived: boolean; checkIn: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {checkIn && (
        <span
          aria-label={arrived ? "도착" : "도착 전"}
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
            arrived ? "bg-brand-700 text-white" : "border border-slate-300 bg-white"
          }`}
        >
          {arrived && <CheckIcon className="size-3" />}
        </span>
      )}
      <span className="break-keep">{name}</span>
    </span>
  );
}

type RosterFilter = "all" | "waiting" | "arrived" | "noTeam";

function RosterPanel({ draw, busy, run }: { draw: Draw; busy: boolean; run: Run }) {
  const roster = rosterOf(draw);
  const checkIn = usesCheckIn(draw);
  const [adding, setAdding] = useState(roster.length === 0);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<RosterFilter>("all");

  const rows = roster.map((player) => ({ player, teams: entriesOf(draw, player) }));
  const arrivedCount = roster.filter((p) => p.checkedInAt).length;
  const waitingCount = roster.length - arrivedCount;
  const filters: { id: RosterFilter; label: string; count: number }[] = [
    { id: "all", label: "전체", count: rows.length },
    ...(checkIn
      ? [
          { id: "waiting" as const, label: "도착 전", count: waitingCount },
          { id: "arrived" as const, label: "도착", count: arrivedCount },
        ]
      : []),
    ...(draw.events.length > 0
      ? [{ id: "noTeam" as const, label: "종목 없음", count: rows.filter((r) => r.teams.length === 0).length }]
      : []),
  ];
  // 체크인을 끄는 등으로 고른 칸이 사라지면 전체를 보여 줍니다.
  const filter = filters.some((f) => f.id === picked) ? picked : "all";
  const key = personKey(query);
  const shown = rows.filter(({ player, teams }) => {
    if (key && !personKey(player.name).includes(key)) return false;
    if (filter === "waiting") return !player.checkedInAt;
    if (filter === "arrived") return Boolean(player.checkedInAt);
    if (filter === "noTeam") return teams.length === 0;
    return true;
  });

  // 찾기·고른 칸과 상관없이 명단 전체를 바꿉니다.
  const checkInAll = (value: boolean) => {
    const count = value ? waitingCount : arrivedCount;
    const question = value
      ? `아직 도착하지 않은 ${count}명을 모두 도착으로 표시할까요?`
      : `도착한 ${count}명을 모두 도착 전으로 되돌릴까요? 도착 시각도 함께 지워집니다.` +
        (draw.events.some((event) => event.status === "live" && event.checkIn)
          ? "\n\n경기 중인 종목은 선수가 다시 도착할 때까지 그 선수의 경기를 시작할 수 없습니다."
          : "");
    if (!window.confirm(question)) return;
    void run(
      { op: "checkInAll", value },
      value ? `${count}명을 도착으로 표시했습니다.` : `${count}명을 도착 전으로 되돌렸습니다.`,
    );
  };

  return (
    <div className="space-y-5">
      <PanelHeader
        title="선수 명단"
        description="대회에 신청한 선수를 한 명씩 올립니다. 종목의 팀은 이 명단에서 골라 짓고, 대회 날에는 이 명단으로 도착을 확인합니다."
      >
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn btn-brand btn-sm">
            <PlusIcon className="size-4" />
            선수 올리기
          </button>
        )}
      </PanelHeader>

      {adding && (
        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-black text-brand-950">선수 올리기</h3>
            {roster.length > 0 && (
              <button
                type="button"
                onClick={() => setAdding(false)}
                aria-label="선수 올리기 닫기"
                className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <CloseIcon className="size-5" />
              </button>
            )}
          </div>
          <p className="mt-1 text-sm break-keep text-slate-500">
            한 줄에 한 명씩 이름, 레이팅, 소속을 쉼표로 나눠 적습니다. 레이팅·소속은 빼도 되고, 이미 있는 이름은 레이팅·소속만 고칩니다.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(10, Math.max(3, text.split("\n").length))}
            className="field mt-3 font-mono text-sm"
            placeholder={"홍길동, 650, KCPC\n김철수, 820\n이영희"}
            spellCheck={false}
          />
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={async () => {
              const count = text.split("\n").filter((line) => line.trim()).length;
              if (await run({ op: "addPlayers", text }, `명단에 ${count}명을 올렸습니다. (이미 있던 이름은 레이팅·소속만 고쳤습니다)`)) {
                setText("");
              }
            }}
            className="btn btn-brand btn-sm mt-3"
          >
            <PlusIcon className="size-4" />
            명단에 올리기
          </button>
        </section>
      )}

      {roster.length > 0 && (
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름으로 찾기"
                aria-label="선수 이름으로 찾기"
                className="field py-2 pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setPicked(f.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                    filter === f.id
                      ? "bg-brand-700 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700"
                  }`}
                >
                  {f.label} <span className="tabular-nums opacity-75">{f.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 줄마다 있는 도착 단추 바로 위에 두어, 같은 일을 한꺼번에 한다는 것이 보이게 합니다. */}
          {checkIn && (
            <div className="mt-3 flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                disabled={busy || waitingCount === 0}
                onClick={() => checkInAll(true)}
                className="btn btn-ghost btn-sm"
              >
                <CheckIcon className="size-4" />
                모두 도착
              </button>
              <button
                type="button"
                disabled={busy || arrivedCount === 0}
                onClick={() => checkInAll(false)}
                className="btn btn-ghost btn-sm"
              >
                모두 도착 전으로
              </button>
            </div>
          )}

          <ul className="mt-4 divide-y divide-slate-100">
            {shown.map(({ player, teams }) =>
              editing === player.id ? (
                <PlayerEditRow
                  key={player.id}
                  player={player}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={async (name, rating, club) => {
                    const ok = await run(
                      { op: "updatePlayer", player: player.id, name, rating, club },
                      `${name} 님의 정보를 고쳤습니다.`,
                    );
                    if (ok) setEditing(null);
                  }}
                />
              ) : (
                <li key={player.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-keep">
                      <span className="font-semibold text-slate-800">{player.name}</span>
                      {(player.rating !== undefined || player.club) && (
                        <span className="ml-2 text-sm text-slate-400 tabular-nums">
                          {[player.rating, player.club].filter((v) => v !== undefined && v !== "").join(" · ")}
                        </span>
                      )}
                    </p>
                    {teams.length > 0 ? (
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {teams.map(({ event, partners }) => (
                          <span
                            key={event.id}
                            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium break-keep text-slate-600"
                          >
                            {event.name}
                            {partners.length > 0 && <span className="text-slate-400"> · {partners.join(", ")}</span>}
                          </span>
                        ))}
                      </p>
                    ) : (
                      draw.events.length > 0 && (
                        <p className="mt-1 text-xs font-semibold text-accent-700">들어 있는 종목 없음</p>
                      )
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {checkIn && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run({ op: "checkIn", player: player.id, value: !player.checkedInAt })}
                        className={`mr-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                          player.checkedInAt
                            ? "bg-brand-700 text-white"
                            : "border border-slate-300 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                        }`}
                      >
                        {player.checkedInAt && <CheckIcon className="size-3.5" />}
                        {/* 휴대폰에서는 이름 칸이 좁아지지 않도록 '도착' 글자를 빼고 시각만 보여 줍니다. */}
                        {player.checkedInAt ? (
                          <>
                            <span className="sr-only sm:not-sr-only">도착 </span>
                            {clockTime(player.checkedInAt, "ko")}
                          </>
                        ) : (
                          "도착 전"
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing(player.id)}
                      aria-label={`${player.name} 고치기`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-700"
                    >
                      <PencilIcon className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`${player.name} 님을 명단에서 지울까요?`)) {
                          void run({ op: "removePlayer", player: player.id }, `${player.name} 님을 명단에서 지웠습니다.`);
                        }
                      }}
                      aria-label={`${player.name} 지우기`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-accent-50 hover:text-accent-700"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
          {shown.length === 0 && <p className="py-8 text-center text-sm text-slate-500">찾는 선수가 없습니다.</p>}
        </section>
      )}
    </div>
  );
}

function PlayerEditRow({
  player,
  busy,
  onSave,
  onCancel,
}: {
  player: DrawPlayer;
  busy: boolean;
  onSave: (name: string, rating: number | null, club: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [rating, setRating] = useState(player.rating === undefined ? "" : String(player.rating));
  const [club, setClub] = useState(player.club ?? "");
  return (
    <li className="-mx-3 rounded-xl bg-brand-50/60 px-3 py-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_6rem_minmax(0,1fr)]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="이름"
          placeholder="이름"
          className="field py-1.5 text-sm"
        />
        <input
          value={rating}
          inputMode="numeric"
          onChange={(e) => setRating(e.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-label="레이팅"
          placeholder="레이팅"
          className="field py-1.5 text-sm"
        />
        <input
          value={club}
          onChange={(e) => setClub(e.target.value)}
          aria-label="소속"
          placeholder="소속"
          className="field py-1.5 text-sm"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave(name, rating === "" ? null : Number(rating), club)}
          className="btn btn-brand btn-sm px-4 py-1.5"
        >
          저장
        </button>
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
          취소
        </button>
        <span className="text-xs break-keep text-slate-500">이름을 바꾸면 그 선수가 든 팀의 이름도 함께 바뀝니다.</span>
      </div>
    </li>
  );
}

// ───────────────────────── 종목 설정 ─────────────────────────

/** 대진표 화면과 같은 경기 방식 이름 ("5세트 3선승") */
const drawText = getDictionary("ko").draw;
const BEST_OF = [3, 5, 7];

const DEFAULT_SETTINGS: EventSettings = {
  name: "",
  doubles: true,
  bestOf: 5,
  groupSize: 4,
  advance: 2,
};

function SettingsForm({
  initial,
  submitLabel,
  busy,
  locked,
  onSubmit,
}: {
  initial: EventSettings;
  submitLabel: string;
  busy: boolean;
  /** 경기를 시작한 종목은 이름과 경기 방식만 고칩니다. */
  locked?: boolean;
  onSubmit: (settings: EventSettings) => Promise<unknown>;
}) {
  const [value, setValue] = useState(initial);
  const set = <K extends keyof EventSettings>(key: K, v: EventSettings[K]) =>
    setValue((current) => ({ ...current, [key]: v }));
  // 본선 방식이 예선과 같으면 따로 정하지 않은 것으로 봅니다. (서버도 같은 값은 지웁니다)
  const split = Boolean(value.knockoutBestOf) && value.knockoutBestOf !== value.bestOf;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(value);
      }}
    >
      <label className="block">
        <span className="label">종목 이름</span>
        <input
          className="field"
          value={value.name}
          maxLength={40}
          placeholder="예: 복식 U1000"
          onChange={(e) => set("name", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label">영어 화면용 이름 (선택)</span>
        <input
          className="field"
          value={value.nameEn ?? ""}
          maxLength={40}
          placeholder="예: Doubles U-1000"
          onChange={(e) => set("nameEn", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label">종류</span>
        <select
          className="field"
          disabled={locked}
          value={value.doubles ? "doubles" : "singles"}
          onChange={(e) => set("doubles", e.target.value === "doubles")}
        >
          <option value="doubles">복식 (두 사람이 한 팀)</option>
          <option value="singles">단식</option>
        </select>
      </label>
      <label className="block">
        <span className="label">예선 한 조 인원</span>
        <select
          className="field"
          disabled={locked}
          value={value.groupSize}
          onChange={(e) => set("groupSize", Number(e.target.value))}
        >
          {[3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}명(팀) {n === 4 ? "— 모자라면 3명 조가 생깁니다" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">조마다 본선 진출</span>
        <select
          className="field"
          disabled={locked}
          value={value.advance}
          onChange={(e) => set("advance", Number(e.target.value))}
        >
          <option value={2}>1·2위</option>
          <option value={1}>1위만</option>
        </select>
      </label>
      {/* 경기 방식은 경기 중인 종목에서도 바꿀 수 있습니다. (바뀌는 경기에 점수가 있으면 서버가 거절합니다) */}
      <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
        <p className="text-sm font-bold text-slate-700">경기 방식</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">예선</span>
            <select className="field" value={value.bestOf} onChange={(e) => set("bestOf", Number(e.target.value))}>
              {BEST_OF.map((n) => (
                <option key={n} value={n}>
                  {drawText.bestOf(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">본선</span>
            <select
              className="field"
              value={value.knockoutBestOf ?? 0}
              onChange={(e) => set("knockoutBestOf", Number(e.target.value) || undefined)}
            >
              <option value={0}>예선과 같게</option>
              {BEST_OF.map((n) => (
                <option key={n} value={n}>
                  {drawText.bestOf(n)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">언제부터</span>
            <select
              className="field"
              disabled={!split}
              value={split ? (value.knockoutFrom ?? 0) : 0}
              onChange={(e) => set("knockoutFrom", Number(e.target.value) || undefined)}
            >
              <option value={0}>본선 처음부터</option>
              <option value={16}>16강부터</option>
              <option value={8}>8강부터</option>
              <option value={4}>준결승부터</option>
              <option value={2}>결승만</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm break-keep text-slate-500">
          {split
            ? `${formatLabel({ ...value, matches: [], status: "setup" }, drawText)}으로 칩니다.`
            : "본선이나 결승만 길게 치려면 본선 경기 방식을 골라 주세요. (예: 예선 3세트 2선승, 8강부터 5세트 3선승)"}
        </p>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-brand btn-sm">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function NewEventPanel({ draw, busy, run, go }: { draw: Draw; busy: boolean; run: Run; go: Go }) {
  return (
    <div className="space-y-5">
      <PanelHeader
        title="종목 추가"
        description="종목마다 참가 팀을 받아 예선 조별 리그를 치르고, 조가 둘 이상이면 본선 토너먼트로 이어집니다."
      />
      <section className="card p-5 sm:p-6">
        <SettingsForm
          key={draw.events.length}
          initial={DEFAULT_SETTINGS}
          submitLabel="종목 만들기"
          busy={busy}
          onSubmit={async (settings) => {
            const next = await run(
              { op: "addEvent", ...settings },
              `'${settings.name}' 종목을 만들었습니다. 참가 팀을 넣어 주세요.`,
            );
            // 새 종목은 맨 뒤에 붙으므로, 만든 뒤 바로 그 종목 화면으로 갑니다.
            if (next && next.events.length > 0) go(next.events[next.events.length - 1].id);
          }}
        />
      </section>
    </div>
  );
}

// ───────────────────────── 종목 화면 ─────────────────────────

type Step = "teams" | "groups" | "start";

function EventPanel({
  draw,
  event,
  busy,
  run,
  go,
  checkInHref,
}: {
  draw: Draw;
  event: DrawEvent;
  busy: boolean;
  run: Run;
  go: Go;
  checkInHref: string;
}) {
  const live = event.status === "live";
  const unit = event.doubles ? "팀" : "명";
  const checkIn = usesCheckIn(draw);
  // 처음 열 때는 아직 끝나지 않은 첫 단계를 보여 줍니다.
  const [step, setStep] = useState<Step>(
    event.entries.length < 2 ? "teams" : event.groups.length === 0 ? "groups" : "start",
  );
  const [editing, setEditing] = useState(false);
  const stepper = useRef<HTMLOListElement>(null);
  const { done, total } = progressOf(event);
  const playing = event.entries.filter((e) => e.absent !== "excluded").length;
  const arrivedTeams = event.entries.filter(presence(draw)).length;
  const settings: EventSettings = {
    name: event.name,
    ...(event.nameEn ? { nameEn: event.nameEn } : {}),
    doubles: event.doubles,
    bestOf: event.bestOf,
    ...(event.knockoutBestOf ? { knockoutBestOf: event.knockoutBestOf } : {}),
    ...(event.knockoutFrom ? { knockoutFrom: event.knockoutFrom } : {}),
    groupSize: event.groupSize,
    advance: event.advance,
  };

  const steps: { id: Step; label: string; meta: string; done: boolean }[] = [
    {
      id: "teams",
      label: event.doubles ? "참가 팀" : "참가 선수",
      meta: `${event.entries.length}${unit}`,
      done: event.entries.length >= 2,
    },
    {
      id: "groups",
      label: "조 편성",
      meta: event.groups.length > 0 ? `${event.groups.length}개 조` : "아직 없음",
      done: event.groups.length > 0,
    },
    {
      id: "start",
      label: checkIn ? "대진 확정" : "경기 시작",
      meta: checkIn ? `도착 ${arrivedTeams}/${event.entries.length}${unit}` : "확인하고 시작",
      done: false,
    },
  ];
  const open = (next: Step) => {
    setStep(next);
    reveal(stepper.current);
  };

  return (
    <div className="space-y-5">
      <PanelHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            {event.name}
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                live ? "bg-accent-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {live ? "경기 중" : "준비 중"}
            </span>
          </span>
        }
        description={`${event.doubles ? "복식" : "단식"} · ${formatLabel(event, drawText)} · 참가 ${playing}${unit}${
          event.groups.length > 0 ? ` · ${event.groups.length}개 조` : ""
        }${event.nameEn ? ` · 영어 이름 ${event.nameEn}` : ""}`}
      >
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing((v) => !v)}
          className="btn btn-ghost btn-sm"
        >
          <PencilIcon className="size-4" />
          종목 설정
        </button>
      </PanelHeader>

      {editing && (
        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-brand-950">종목 설정</h3>
              {live && (
                <p className="mt-1 text-sm break-keep text-slate-500">
                  경기를 시작한 종목은 이름과 경기 방식만 바꿀 수 있습니다. 경기 방식은 바뀌는 라운드에 아직 점수가 없을 때만 바뀝니다.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="종목 설정 닫기"
              className="-m-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <div className="mt-4">
            <SettingsForm
              key={JSON.stringify(settings)}
              initial={settings}
              submitLabel="설정 저장"
              busy={busy}
              locked={live}
              onSubmit={async (next) => {
                if (await run({ op: "updateEvent", event: event.id, ...next }, "종목 설정을 저장했습니다.")) {
                  setEditing(false);
                }
              }}
            />
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    `'${event.name}' 종목을 지울까요? 참가 팀과 경기 결과가 모두 지워집니다. (선수 명단은 남습니다)`,
                  )
                ) {
                  return;
                }
                const next = await run({ op: "removeEvent", event: event.id }, "종목을 지웠습니다.");
                if (next) go(defaultView(next));
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline"
            >
              <TrashIcon className="size-4" />
              종목 지우기
            </button>
          </div>
        </section>
      )}

      {live ? (
        <>
          <section className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-bold text-slate-700">경기 진행</span>
              <span className="text-slate-500 tabular-nums">
                {done}/{total} 끝남
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-[width]"
                style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
              />
            </div>
            <button type="button" onClick={() => go("play")} className="btn btn-brand btn-sm mt-4">
              경기 진행 화면에서 점수 보기
              <ArrowRightIcon className="size-4" />
            </button>
          </section>

          {draw.tables > 0 && (
            <section className="card p-5 sm:p-6">
              <GroupTablesEditor draw={draw} event={event} busy={busy} run={run} />
            </section>
          )}

          <section className="card p-5 sm:p-6">
            <LiveTeams draw={draw} event={event} busy={busy} run={run} />
          </section>

          <section className="rounded-2xl border border-accent-200 bg-white p-5 sm:p-6">
            <h3 className="font-black text-accent-700">조 편성으로 되돌리기</h3>
            <p className="mt-1 text-sm break-keep text-slate-600">
              팀이나 조 편성을 바꾸려면 조 편성 단계로 되돌려야 하고, 그러면 입력한 점수가 모두 지워집니다.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `'${event.name}' 의 경기 결과 ${done}개를 모두 지우고 확정 전의 조 편성으로 되돌릴까요? 되돌린 뒤에는 결과를 되살릴 수 없습니다.`,
                  )
                ) {
                  void run({ op: "reset", event: event.id }, "조 편성 단계로 되돌렸습니다.");
                }
              }}
              className="btn btn-ghost btn-sm mt-4 text-accent-700"
            >
              조 편성으로 되돌리기
            </button>
          </section>
        </>
      ) : (
        <>
          <ol ref={stepper} aria-label="종목 준비 단계" className="grid scroll-mt-36 grid-cols-3 gap-2 lg:scroll-mt-24">
            {steps.map((item, index) => {
              const active = step === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={active ? "step" : undefined}
                    onClick={() => open(item.id)}
                    className={`flex h-full w-full flex-col items-start gap-1.5 rounded-xl border bg-white px-3 py-2.5 text-left transition-colors sm:flex-row sm:items-center sm:gap-3 ${
                      active
                        ? "border-brand-700 shadow-sm ring-1 ring-brand-700"
                        : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                        item.done
                          ? "bg-brand-700 text-white"
                          : active
                            ? "bg-brand-100 text-brand-800"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.done ? <CheckIcon className="size-4" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-bold break-keep ${active ? "text-brand-900" : "text-slate-700"}`}>
                        {item.label}
                      </span>
                      <span className="block text-xs break-keep text-slate-500">{item.meta}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="card p-5 sm:p-6">
            {step === "teams" && <TeamsEditor draw={draw} event={event} busy={busy} run={run} go={go} />}
            {step === "groups" && <GroupsEditor draw={draw} event={event} busy={busy} run={run} />}
            {step === "start" && (
              <ConfirmPanel draw={draw} event={event} busy={busy} run={run} checkInHref={checkInHref} />
            )}

            {step !== "start" && (
              <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => open(step === "teams" ? "groups" : "start")}
                  className="btn btn-ghost btn-sm"
                >
                  다음: {step === "teams" ? steps[1].label : steps[2].label}
                  <ArrowRightIcon className="size-4" />
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** 팀 이름. 체크인을 쓰면 선수마다 도착 표시를 붙입니다. */
function TeamName({ draw, entry }: { draw: Draw; entry: DrawEntry }) {
  const checkIn = usesCheckIn(draw);
  const arrived = new Set(arrivedPlayers(draw, entry).map(personKey));
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-slate-800">
      {entry.players.map((name, i) => (
        <span key={name} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-slate-300">/</span>}
          <PlayerName name={name} arrived={arrived.has(personKey(name))} checkIn={checkIn} />
        </span>
      ))}
    </span>
  );
}

/** 팀원을 명단의 다른 선수로 바꾸는 고르기 칸 */
function ReplaceSelect({
  draw,
  event,
  entry,
  busy,
  run,
}: {
  draw: Draw;
  event: DrawEvent;
  entry: DrawEntry;
  busy: boolean;
  run: Run;
}) {
  const free = rosterOf(draw)
    .filter((p) => !teamOf(event, p.name))
    .sort((x, y) => Number(Boolean(y.checkedInAt)) - Number(Boolean(x.checkedInAt)));
  if (free.length === 0) return null;
  return (
    <select
      value=""
      disabled={busy}
      aria-label={`${entryName(entry)} 선수 바꾸기`}
      onChange={(e) => {
        const [index, player] = e.target.value.split(":");
        const to = free.find((p) => p.id === player);
        void run(
          { op: "replacePlayer", event: event.id, entry: entry.id, index: Number(index), player },
          `${entry.players[Number(index)]} 님 대신 ${to?.name ?? ""} 님을 넣었습니다.`,
        );
      }}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
    >
      <option value="">선수 바꾸기</option>
      {entry.players.map((name, index) => (
        <optgroup key={name} label={`${name} 대신`}>
          {free.map((p) => (
            <option key={p.id} value={`${index}:${p.id}`}>
              {p.name}
              {p.checkedInAt ? " (도착)" : ""}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function TeamsEditor({
  draw,
  event,
  busy,
  run,
  go,
}: {
  draw: Draw;
  event: DrawEvent;
  busy: boolean;
  run: Run;
  go: Go;
}) {
  const need = event.doubles ? 2 : 1;
  const free = rosterOf(draw).filter((p) => !teamOf(event, p.name));
  const [picks, setPicks] = useState<string[]>(Array.from({ length: need }, () => ""));
  const unit = event.doubles ? "팀" : "명";

  return (
    <div>
      <h3 className="font-black text-brand-950">{event.doubles ? "참가 팀" : "참가 선수"}</h3>
      <p className="mt-1 text-sm break-keep text-slate-500">
        선수 명단에서 골라 {event.doubles ? "두 사람을 한 팀으로" : "참가자로"} 넣습니다. 명단에 없는 사람은{" "}
        <button type="button" onClick={() => go("roster")} className="font-semibold text-brand-700 underline">
          선수 명단
        </button>
        에 먼저 올려 주세요.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
        {picks.map((value, i) => (
          <select
            key={i}
            value={value}
            onChange={(e) => setPicks((current) => current.map((v, k) => (k === i ? e.target.value : v)))}
            aria-label={`${i + 1}번째 선수`}
            className="field w-auto min-w-40 py-2 text-sm"
          >
            <option value="">{event.doubles ? `${i + 1}번째 선수` : "선수"}</option>
            {free
              .filter((p) => !picks.includes(p.id) || p.id === value)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.rating !== undefined ? ` (${p.rating})` : ""}
                </option>
              ))}
          </select>
        ))}
        <button
          type="button"
          disabled={busy || picks.some((v) => !v)}
          onClick={async () => {
            const ok = await run({ op: "addTeam", event: event.id, players: picks }, `${unit}을 넣었습니다.`);
            if (ok) setPicks(Array.from({ length: need }, () => ""));
          }}
          className="btn btn-brand btn-sm"
        >
          <PlusIcon className="size-4" />
          {unit} 넣기
        </button>
        {free.length === 0 && <span className="text-xs text-slate-400">명단의 모든 선수가 이 종목에 들어 있습니다.</span>}
      </div>

      {event.entries.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {event.entries.map((entry, index) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="w-6 text-sm font-bold text-slate-400 tabular-nums">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <TeamName draw={draw} entry={entry} />
                <span className="block text-xs text-slate-400">
                  {[entry.rating ?? "레이팅 없음", entry.club].filter(Boolean).join(" · ")}
                </span>
              </span>
              <ReplaceSelect draw={draw} event={event} entry={entry} busy={busy} run={run} />
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`${entryName(entry)} ${unit}을 이 종목에서 뺄까요? (선수 명단에는 남습니다)`)) {
                    void run({ op: "removeTeam", event: event.id, entry: entry.id }, `${entryName(entry)} ${unit}을 뺐습니다.`);
                  }
                }}
                className="text-xs font-semibold text-accent-700 hover:underline"
              >
                빼기
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-500">
          붙여 넣기로 한꺼번에 바꾸기
        </summary>
        <EntriesEditor key={entriesToText(event.entries)} event={event} busy={busy} run={run} />
      </details>
    </div>
  );
}

function EntriesEditor({ event, busy, run }: { event: DrawEvent; busy: boolean; run: Run }) {
  const saved = entriesToText(event.entries);
  const [text, setText] = useState(saved);
  const preview = parseEntries(text, event.doubles);
  const unit = event.doubles ? "팀" : "명";
  const changed = text.trim() !== saved.trim();

  return (
    <div className="mt-3">
      <p className="text-sm break-keep text-slate-500">
        지금 {unit} 목록을 아래 글로 통째로 바꿉니다. 한 줄에 {event.doubles ? "한 팀" : "한 명"}씩 적고 칸은 쉼표나 탭으로 나눕니다. 처음 보는 이름은 선수 명단에 저절로 올라갑니다.
        <br />
        {event.doubles
          ? "예) 홍길동 / 김철수, 600, 500, KCPC   — 이름 두 개, 레이팅(각자 또는 두 사람 합), 소속(선택)"
          : "예) 홍길동, 1500, KCPC   — 이름, 레이팅, 소속(선택)"}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(16, Math.max(4, text.split("\n").length + 1))}
        className="field mt-3 font-mono text-sm"
        placeholder={event.doubles ? "홍길동 / 김철수, 600, 500, KCPC" : "홍길동, 1500, KCPC"}
        spellCheck={false}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !changed || preview.errors.length > 0}
          onClick={() => {
            if (event.groups.length > 0 && !window.confirm("목록을 바꾸면 지금 조 편성이 지워집니다. 바꿀까요?")) return;
            void run(
              { op: "entries", event: event.id, text },
              `${preview.entries.length}${unit}으로 바꿨습니다. 조 편성을 새로 만들어 주세요.`,
            );
          }}
          className="btn btn-brand btn-sm"
        >
          목록 바꾸기
        </button>
        <span className="text-sm text-slate-500">
          {preview.entries.length}
          {unit}
          {changed && " · 저장하지 않은 변경이 있습니다"}
        </span>
      </div>
      {preview.errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
          {preview.errors.slice(0, 8).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GroupsEditor({ draw, event, busy, run }: { draw: Draw; event: DrawEvent; busy: boolean; run: Run }) {
  const entries = new Map(event.entries.map((e) => [e.id, e]));
  const hasGroups = event.groups.length > 0;
  const placed = new Set(event.groups.flat());
  const unplaced = event.entries.filter((e) => !placed.has(e.id));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-72">
          <h3 className="font-black text-brand-950">조 편성</h3>
          <p className="mt-1 text-sm break-keep text-slate-500">
            레이팅이 높은 순서로 A조부터 지그재그로 나누고, 같은 소속은 되도록 다른 조에 넣습니다. 레이팅이 없으면 목록 순서를 따릅니다.
            대회 전에 미리 만들어 두면, 대진을 확정할 때 도착하지 않은 팀만 빠집니다.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || event.entries.length < 2}
          onClick={() => {
            if (!hasGroups || window.confirm("지금 조 편성을 지우고 다시 만들까요?")) {
              void run({ op: "autoGroups", event: event.id }, "조 편성을 만들었습니다.");
            }
          }}
          className={`btn btn-sm ${hasGroups ? "btn-ghost" : "btn-brand"}`}
        >
          {hasGroups ? "조 편성 다시 만들기" : "조 편성 만들기"}
        </button>
      </div>

      {!hasGroups && event.entries.length < 2 && (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          참가 {event.doubles ? "팀" : "선수"}이 둘 이상 있어야 조를 나눌 수 있습니다.
        </p>
      )}

      {hasGroups && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {event.groups.map((members, group) => (
            <div key={group} className="rounded-xl border border-slate-200">
              <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-brand-900">
                {groupLetter(group)}조 · {members.length}
                {event.doubles ? "팀" : "명"}
              </p>
              <ul className="divide-y divide-slate-100">
                {members.map((id) => {
                  const entry = entries.get(id);
                  if (!entry) return null;
                  return (
                    <li key={id} className="flex items-center gap-2 px-4 py-2">
                      <span className="min-w-0 flex-1 text-sm">
                        <TeamName draw={draw} entry={entry} />
                        <span className="block text-xs text-slate-400">
                          {[entry.rating ?? "레이팅 없음", entry.club].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <select
                        aria-label={`${entryName(entry)} 다른 조로 옮기기`}
                        value=""
                        disabled={busy}
                        onChange={(e) =>
                          void run({ op: "moveEntry", event: event.id, entry: id, group: Number(e.target.value) })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                      >
                        <option value="">옮기기</option>
                        {event.groups.map((_, g) =>
                          g === group ? null : (
                            <option key={g} value={g}>
                              {groupLetter(g)}조로
                            </option>
                          ),
                        )}
                        <option value={event.groups.length}>새 조로</option>
                      </select>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      {hasGroups && unplaced.length > 0 && (
        <p className="mt-3 text-sm break-keep text-slate-500">
          조에 아직 없는 {event.doubles ? "팀" : "참가자"}: {unplaced.map(entryName).join(", ")} — 대진을 확정할 때 인원이 적은 조에 들어갑니다.
        </p>
      )}
    </div>
  );
}

// ───────────────────────── 체크인 확인과 대진 확정 ─────────────────────────

function ConfirmPanel({
  draw,
  event,
  busy,
  run,
  checkInHref,
}: {
  draw: Draw;
  event: DrawEvent;
  busy: boolean;
  run: Run;
  checkInHref: string;
}) {
  const checkIn = usesCheckIn(draw);
  const isPresent = presence(draw);
  const [waiting, setWaiting] = useState<string[]>([]);
  const waitingSet = new Set(waiting);
  const plan = planStart(event, isPresent, waitingSet);
  const entries = new Map(event.entries.map((e) => [e.id, e]));
  const nameOf = (id: string) => {
    const entry = entries.get(id);
    return entry ? entryName(entry) : "?";
  };
  const notHere = event.entries.filter((e) => !isPresent(e));
  const arrivedTeams = event.entries.length - notHere.length;
  const partial = notHere.filter((e) => arrivedPlayers(draw, e).length > 0).length;
  const knockout = "groups" in plan && plan.groups.length > 1;

  if (event.entries.length === 0) {
    return (
      <p className="text-sm break-keep text-slate-500">
        참가 {event.doubles ? "팀" : "선수"}을 먼저 넣어 주세요.
      </p>
    );
  }

  return (
    <div>
      <h3 className="font-black text-brand-950">{checkIn ? "체크인 확인과 대진 확정" : "경기 시작"}</h3>

      {checkIn && (
        <>
          <p className="mt-1 text-sm break-keep text-slate-600">
            도착한 {event.doubles ? "팀(두 사람 모두 체크인)" : "선수"}만으로 대진을 확정합니다. 아직 오지 않은{" "}
            {event.doubles ? "팀" : "선수"}은 빼거나, 조에 남겨 두고 기다릴 수 있습니다. 기다리는 {event.doubles ? "팀" : "선수"}의 경기는 도착할 때까지 시작할 수 없습니다.
          </p>
          <p className="mt-3 text-sm font-bold text-slate-700">
            도착 {arrivedTeams}
            {event.doubles ? "팀" : "명"}
            {event.doubles && partial > 0 && ` · 한 명만 도착 ${partial}팀`}
            {` · 아직 ${notHere.length - partial}${event.doubles ? "팀" : "명"}`}
            <a href={checkInHref} className="ml-3 text-brand-700 underline">
              체크인 화면
            </a>
          </p>

          {notHere.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {notHere.map((entry) => {
                const wait = waitingSet.has(entry.id);
                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                    <span className="min-w-0 flex-1 text-sm">
                      <TeamName draw={draw} entry={entry} />
                    </span>
                    <ReplaceSelect draw={draw} event={event} entry={entry} busy={busy} run={run} />
                    <span className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs font-bold">
                      <button
                        type="button"
                        aria-pressed={!wait}
                        onClick={() => setWaiting((list) => list.filter((id) => id !== entry.id))}
                        className={`px-3 py-1.5 ${!wait ? "bg-accent-600 text-white" : "bg-white text-slate-500"}`}
                      >
                        빼기
                      </button>
                      <button
                        type="button"
                        aria-pressed={wait}
                        onClick={() => setWaiting((list) => [...list.filter((id) => id !== entry.id), entry.id])}
                        className={`px-3 py-1.5 ${wait ? "bg-brand-700 text-white" : "bg-white text-slate-500"}`}
                      >
                        기다리기
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {"error" in plan ? (
        <p className="mt-3 text-sm font-semibold break-keep text-accent-700">{plan.error}</p>
      ) : (
        <div className="mt-4 space-y-2 rounded-xl bg-brand-50/60 p-4 text-sm break-keep text-slate-700">
          {plan.excluded.length > 0 && (
            <p>
              <strong className="text-accent-700">빠지는 {event.doubles ? "팀" : "선수"}:</strong>{" "}
              {plan.excluded.map(nameOf).join(", ")}
            </p>
          )}
          {plan.waiting.length > 0 && (
            <p>
              <strong className="text-brand-700">기다리는 {event.doubles ? "팀" : "선수"}:</strong>{" "}
              {plan.waiting.map(nameOf).join(", ")}
            </p>
          )}
          <p className="text-slate-500">
            {plan.regrouped
              ? event.groups.length > 0
                ? "빈자리 때문에 너무 작아진 조가 있어 조를 다시 나눕니다."
                : "레이팅 순서로 조를 나눕니다."
              : "미리 만든 조 편성을 그대로 씁니다."}{" "}
            {knockout
              ? `조별 리그가 끝나면 조 ${event.advance === 2 ? "1·2위" : "1위"}가 본선 토너먼트에 오릅니다.`
              : "조가 하나라서 리그 순위로 우승을 정합니다."}
            {draw.tables > 0 && " 확정하면 조마다 테이블이 하나씩 정해지고, 종목 화면의 조별 테이블에서 바꿀 수 있습니다."}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {plan.groups.map((members, group) => (
              <li key={group} className="rounded-lg bg-white px-3 py-2 ring-1 ring-brand-100">
                <span className="font-black text-brand-900">{groupLetter(group)}조</span>{" "}
                <span className="text-slate-600">{members.map(nameOf).join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        disabled={busy || "error" in plan}
        onClick={() => {
          if ("error" in plan) return;
          const lines = [
            `'${event.name}' 대진을 확정하고 경기를 시작할까요?`,
            plan.excluded.length > 0 ? `빠지는 ${event.doubles ? "팀" : "선수"}: ${plan.excluded.map(nameOf).join(", ")}` : "",
            plan.waiting.length > 0 ? `기다리는 ${event.doubles ? "팀" : "선수"}: ${plan.waiting.map(nameOf).join(", ")}` : "",
            "시작한 뒤에는 팀과 조 편성을 바꿀 수 없습니다.",
          ].filter(Boolean);
          if (window.confirm(lines.join("\n"))) {
            void run({ op: "start", event: event.id, waiting }, `'${event.name}' 경기를 시작했습니다.`);
          }
        }}
        className="btn btn-accent btn-sm mt-5"
      >
        {checkIn ? "대진 확정하고 경기 시작" : "경기 시작"}
      </button>
    </div>
  );
}

// ───────────────────────── 조별 테이블 ─────────────────────────

/**
 * 조마다 경기하는 테이블. 대진을 확정할 때 저절로 정해지고, 여기서 바꿉니다.
 * 4팀 이상인 조는 동시에 두 경기를 칠 수 있어 '함께 쓰는 테이블'을 더 고를 수 있습니다.
 */
function GroupTablesEditor({ draw, event, busy, run }: { draw: Draw; event: DrawEvent; busy: boolean; run: Run }) {
  // 조 테이블을 아직 저장하지 않은 대진표도 화면과 같은 값을 보여 줍니다.
  const shown = withGroupTables(draw);
  const current = shown.events.find((e) => e.id === event.id);
  const tables = current?.groupTables ?? [];
  const extras = current?.extraTables ?? [];
  const context = eventContext(event);
  // 테이블마다 그 테이블을 쓰는, 경기가 남은 조 (다른 종목 포함)
  const users = new Map<number, string[]>();
  for (const other of shown.events) {
    if (other.status !== "live") continue;
    const c = eventContext(other);
    other.groups.forEach((_, group) => {
      if (c.groupComplete(group)) return;
      const used = [other.groupTables?.[group], ...(other.extraTables?.[group] ?? [])];
      for (const table of new Set(used)) {
        if (table) users.set(table, [...(users.get(table) ?? []), `${other.id}:${group}`]);
      }
    });
  }
  const groupName = (key: string) => {
    const [id, group] = key.split(":");
    const other = shown.events.find((e) => e.id === id);
    return other ? `${other.id === event.id ? "" : `${other.name} `}${groupLetter(Number(group))}조` : "";
  };
  const tableOptions = (skip?: number) =>
    Array.from({ length: draw.tables }, (_, i) => i + 1)
      .filter((n) => n !== skip)
      .map((n) => (
        <option key={n} value={n}>
          {n}번 테이블
        </option>
      ));
  const selectClass = "rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm";

  return (
    <div>
      <h3 className="font-black text-brand-950">조별 테이블</h3>
      <p className="mt-1 text-sm break-keep text-slate-500">
        조 안의 경기는 그 조의 테이블에서 아무 순서로나 칩니다. 4팀 조는 겹치지 않는 두 경기를 함께 칠 수 있어, 남는 테이블을
        하나 더 씁니다. 조 경기가 끝난 테이블과 남는 테이블은 본선 경기와 다른 경기에 씁니다.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {event.groups.map((members, group) => {
          const table = tables[group];
          const extra = extras[group] ?? [];
          const complete = context.groupComplete(group);
          const sharing = [
            ...new Set([table, ...extra].flatMap((n) => users.get(n) ?? [])),
          ].filter((key) => key !== `${event.id}:${group}`);
          // 함께 쓸 수 있는 테이블 수만큼 칸을 둡니다. (4·5팀 조 1칸, 6팀 조 2칸)
          const slots = groupCapacity(members.length) - 1;
          const setExtra = (index: number, value: number) => {
            const next = [...extra];
            if (value) next[index] = value;
            else next.splice(index, 1);
            const list = [...new Set(next.filter(Boolean))];
            void run(
              { op: "extraTables", event: event.id, group, tables: list },
              list.length > 0
                ? `${groupLetter(group)}조가 ${list.map((n) => `${n}번`).join("·")} 테이블을 함께 씁니다.`
                : `${groupLetter(group)}조는 조 테이블만 씁니다.`,
            );
          };
          return (
            <li key={group} className="rounded-xl border border-slate-200 px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-brand-900">
                  {groupLetter(group)}조
                  {complete && <span className="ml-2 text-xs font-semibold text-slate-400">경기 끝</span>}
                </span>
                <select
                  aria-label={`${groupLetter(group)}조 테이블`}
                  value={table ?? ""}
                  disabled={busy}
                  onChange={(e) =>
                    void run(
                      { op: "groupTable", event: event.id, group, table: Number(e.target.value) },
                      `${groupLetter(group)}조를 ${e.target.value}번 테이블로 옮겼습니다.`,
                    )
                  }
                  className={selectClass}
                >
                  {tableOptions()}
                </select>
              </div>
              {Array.from({ length: slots }, (_, index) => (
                <div key={index} className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-500">함께 쓰는 테이블</span>
                  <select
                    aria-label={`${groupLetter(group)}조가 함께 쓰는 테이블`}
                    value={extra[index] ?? 0}
                    disabled={busy || index > extra.length}
                    onChange={(e) => setExtra(index, Number(e.target.value))}
                    className={selectClass}
                  >
                    <option value={0}>없음</option>
                    {tableOptions(table)}
                  </select>
                </div>
              ))}
              {!complete && sharing.length > 0 && (
                <p className="mt-1 text-xs break-keep text-slate-500">{sharing.map(groupName).join(", ")}와 함께 씀</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────── 경기 중 팀 상태 ─────────────────────────

function LiveTeams({ draw, event, busy, run }: { draw: Draw; event: DrawEvent; busy: boolean; run: Run }) {
  const isPresent = presence(draw);
  const waiting = event.checkIn ? event.entries.filter((e) => !e.absent && !isPresent(e)) : [];
  const forfeits = event.entries.filter((e) => e.absent === "forfeit");
  const excluded = event.entries.filter((e) => e.absent === "excluded");
  const active = event.entries.filter((e) => !e.absent);
  const unit = event.doubles ? "팀" : "선수";

  const forfeit = (entry: DrawEntry) => {
    if (window.confirm(`${entryName(entry)} ${unit}을 불참 처리할까요? 남은 경기는 모두 기권패로 적힙니다.`)) {
      void run({ op: "forfeit", event: event.id, entry: entry.id, value: true }, `${entryName(entry)} ${unit}을 불참 처리했습니다.`);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-black text-brand-950">참가 {unit} 관리</h3>
        <p className="mt-1 text-sm break-keep text-slate-500">
          경기 중에 오지 않거나 빠지는 {unit}은 불참 처리합니다. 불참 처리한 {unit}의 남은 경기는 모두 기권패로 적힙니다.
        </p>
      </div>

      {waiting.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800">도착을 기다리는 {unit}</h4>
          <p className="mt-0.5 text-sm break-keep text-slate-500">
            체크인하면 바로 경기를 시작할 수 있습니다. 끝내 오지 않으면 불참 처리해 주세요.
          </p>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {waiting.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm">
                  <TeamName draw={draw} entry={entry} />
                </span>
                <ReplaceSelect draw={draw} event={event} entry={entry} busy={busy} run={run} />
                <button type="button" disabled={busy} onClick={() => forfeit(entry)} className="btn btn-ghost btn-sm text-accent-700">
                  불참 처리
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {forfeits.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-800">불참 처리한 {unit}</h4>
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {forfeits.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 text-sm text-slate-500 line-through">{entryName(entry)}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run({ op: "forfeit", event: event.id, entry: entry.id, value: false }, `${entryName(entry)} ${unit}의 불참을 취소했습니다.`)
                  }
                  className="btn btn-ghost btn-sm"
                >
                  불참 취소
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {excluded.length > 0 && (
        <p className="text-sm break-keep text-slate-500">
          대진 확정 때 빠진 {unit}: {excluded.map(entryName).join(", ")}
        </p>
      )}

      {active.length > 0 && (
        <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>경기 중에 빠지는 {unit}:</span>
          <select
            value=""
            disabled={busy}
            onChange={(e) => {
              const entry = active.find((x) => x.id === e.target.value);
              if (entry) forfeit(entry);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">불참 처리할 {unit} 고르기</option>
            {active.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entryName(entry)}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
