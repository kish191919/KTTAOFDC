"use client";

import { useState } from "react";
import { drawAdminAction } from "@/lib/actions";
import type { DrawOp, EventSettings } from "@/lib/draw/admin";
import { entriesToText, entryName, parseEntries } from "@/lib/draw/entries";
import { winnerOf } from "@/lib/draw/play";
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
import type { Draw, DrawEntry, DrawEvent, DrawPlayer } from "@/lib/types";
import { DrawBoard } from "@/components/draw/DrawBoard";
import { clockTime } from "@/components/draw/labels";
import { useLiveDraw } from "@/components/draw/useLiveDraw";
import { CheckIcon, ExternalLinkIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";

type Props = {
  tournamentId: string;
  initial: DrawPayload;
  renderedAt: string;
  /** 방문자용 실시간 대진표 주소 */
  publicHref: string;
  /** 접수 데스크용 체크인 화면 주소 */
  checkInHref: string;
};

type Run = (op: DrawOp, notice?: string) => Promise<boolean>;

/** 관리자 화면의 대진표 관리: 대회장 설정, 선수 명단, 종목별 팀·조 편성·대진 확정, 경기 진행 */
export function DrawManager({ tournamentId, initial, renderedAt, publicHref, checkInHref }: Props) {
  const { payload, online, checkedAt, refresh, setDraw } = useLiveDraw(tournamentId, initial);
  const draw = payload.draw;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const run: Run = async (op, notice) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await drawAdminAction(tournamentId, op);
      if ("error" in result) {
        setMessage({ error: true, text: result.error });
        return false;
      }
      setDraw(result.draw);
      if (notice) setMessage({ error: false, text: notice });
      return true;
    } catch {
      setMessage({ error: true, text: "저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const live = draw.events.some((event) => event.status === "live");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${online ? "text-slate-500" : "font-bold text-accent-600"}`}>
          <span suppressHydrationWarning>
            {online
              ? `${clockTime(checkedAt ?? renderedAt, "ko", true)} 기준 · 5초마다 새로 고칩니다`
              : "연결이 끊겼습니다. 다시 연결하는 중입니다…"}
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {usesCheckIn(draw) && (
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

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`sticky top-20 z-10 rounded-xl px-4 py-3 text-sm font-semibold whitespace-pre-line shadow-sm ${
            message.error
              ? "bg-accent-50 text-accent-700 ring-1 ring-accent-200"
              : "bg-brand-50 text-brand-800 ring-1 ring-brand-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <VenueSettings draw={draw} scoring={payload.scoring} busy={busy} run={run} />
      <RosterSection draw={draw} busy={busy} run={run} />

      {draw.events.map((event) => (
        <EventCard key={event.id} draw={draw} event={event} busy={busy} run={run} checkInHref={checkInHref} />
      ))}

      <AddEvent busy={busy} run={run} count={draw.events.length} />

      {live && (
        <section className="space-y-4 border-t border-brand-100 pt-8">
          <div>
            <h2 className="text-2xl font-black text-brand-950">경기 진행</h2>
            <p className="mt-1 text-sm break-keep text-slate-500">
              방문자 화면과 같습니다. 경기를 누르면 점수를 고치거나, 테이블을 옮기거나, 결과를 지울 수 있습니다.
            </p>
          </div>
          <DrawBoard
            tournamentId={tournamentId}
            lang="ko"
            draw={draw}
            scoring={payload.scoring}
            admin
            onDraw={setDraw}
            onRefresh={refresh}
          />
        </section>
      )}
    </div>
  );
}

// ───────────────────────── 대회장 설정 ─────────────────────────

function VenueSettings({
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
  return (
    <section className="card p-6">
      <h2 className="text-lg font-black text-brand-950">대회장 설정</h2>
      <form
        className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-[8rem_1fr_1fr_auto] md:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          void run(
            { op: "settings", tables: Number(tables), scoringOpen: open, checkIn },
            "대회장 설정을 저장했습니다.",
          );
        }}
      >
        <label className="block">
          <span className="label">테이블 수</span>
          <input
            type="number"
            min={0}
            max={40}
            value={tables}
            onChange={(e) => setTables(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex cursor-pointer items-start gap-3 md:pt-7">
          <input
            type="checkbox"
            checked={checkIn}
            onChange={(e) => setCheckIn(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-brand-700"
          />
          <span>
            <span className="block font-semibold text-slate-800">체크인 사용</span>
            <span className="hint block break-keep">
              대회 날 접수 데스크에서 선수 도착을 확인하고, 도착한 팀만으로 대진을 확정합니다.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 md:pt-7">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-brand-700"
          />
          <span>
            <span className="block font-semibold text-slate-800">누구나 점수 입력</span>
            <span className="hint block break-keep">
              체크를 풀면 관리자만 입력할 수 있습니다. 체크해 두어도 대회 다음 날이 지나면 저절로 막힙니다.
            </span>
          </span>
        </label>
        <button type="submit" disabled={busy} className="btn btn-brand btn-sm md:mt-7">
          저장
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-500">
        테이블을 0으로 두면 자동 배정 없이 경기 순서만 보여 줍니다. 지금 방문자 점수 입력:{" "}
        <strong className={scoring ? "text-brand-700" : "text-accent-700"}>{scoring ? "열림" : "닫힘"}</strong>
      </p>
    </section>
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

function RosterSection({ draw, busy, run }: { draw: Draw; busy: boolean; run: Run }) {
  const roster = rosterOf(draw);
  const checkIn = usesCheckIn(draw);
  const arrived = roster.filter((p) => p.checkedInAt).length;
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const key = personKey(query);
  const shown = key ? roster.filter((p) => personKey(p.name).includes(key)) : roster;
  const doublesEvents = draw.events.filter((e) => e.doubles && e.status === "setup");

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-black text-brand-950">선수 명단</h2>
        <p className="text-sm text-slate-500">
          {roster.length}명{checkIn && ` · 도착 ${arrived}명`}
        </p>
      </div>
      <p className="mt-1 text-sm break-keep text-slate-500">
        대회에 신청한 선수를 한 명씩 올립니다. 종목의 팀은 이 명단에서 골라 짓고, 대회 날에는 이 명단으로 도착을 확인합니다.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={Math.min(8, Math.max(2, text.split("\n").length))}
          className="field font-mono text-sm"
          placeholder={"한 줄에 한 명: 이름, 레이팅, 소속 (레이팅·소속은 빼도 됩니다)\n예) 홍길동, 650, KCPC"}
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
          className="btn btn-brand btn-sm"
        >
          <PlusIcon className="size-4" />
          명단에 올리기
        </button>
      </div>

      {roster.length > 0 && (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름으로 찾기"
            aria-label="선수 이름으로 찾기"
            className="field mt-5 max-w-xs py-2"
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th scope="col" className="py-2 pr-3 font-bold">이름</th>
                  <th scope="col" className="w-20 py-2 pr-3 font-bold">레이팅</th>
                  <th scope="col" className="w-28 py-2 pr-3 font-bold">소속</th>
                  <th scope="col" className="py-2 pr-3 font-bold">종목 · 짝</th>
                  {checkIn && <th scope="col" className="w-24 py-2 pr-3 font-bold">도착</th>}
                  <th scope="col" className="w-20 py-2" />
                </tr>
              </thead>
              <tbody>
                {shown.map((player) =>
                  editing === player.id ? (
                    <PlayerEditRow
                      key={player.id}
                      player={player}
                      checkIn={checkIn}
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
                    <tr key={player.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 font-semibold text-slate-800">{player.name}</td>
                      <td className="py-2 pr-3 text-slate-600 tabular-nums">{player.rating ?? "–"}</td>
                      <td className="py-2 pr-3 text-slate-600">{player.club ?? ""}</td>
                      <td className="py-2 pr-3 text-slate-600">
                        {entriesOf(draw, player).map(({ event, partners }) => (
                          <span key={event.id} className="block break-keep">
                            {event.name}
                            {partners.length > 0 && ` · ${partners.join(", ")}`}
                          </span>
                        ))}
                        {doublesEvents.length > 0 && entriesOf(draw, player).length === 0 && (
                          <span className="font-semibold text-accent-700">팀 없음</span>
                        )}
                      </td>
                      {checkIn && (
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run({ op: "checkIn", player: player.id, value: !player.checkedInAt })
                            }
                            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                              player.checkedInAt
                                ? "bg-brand-700 text-white"
                                : "border border-slate-300 text-slate-500 hover:border-brand-300 hover:text-brand-700"
                            }`}
                          >
                            {player.checkedInAt ? `도착 ${clockTime(player.checkedInAt, "ko")}` : "도착 전"}
                          </button>
                        </td>
                      )}
                      <td className="py-2 text-right whitespace-nowrap">
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
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function PlayerEditRow({
  player,
  checkIn,
  busy,
  onSave,
  onCancel,
}: {
  player: DrawPlayer;
  checkIn: boolean;
  busy: boolean;
  onSave: (name: string, rating: number | null, club: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [rating, setRating] = useState(player.rating === undefined ? "" : String(player.rating));
  const [club, setClub] = useState(player.club ?? "");
  return (
    <tr className="border-b border-slate-100 bg-brand-50/40">
      <td className="py-2 pr-3">
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label="이름" className="field py-1.5 text-sm" />
      </td>
      <td className="py-2 pr-3">
        <input
          value={rating}
          inputMode="numeric"
          onChange={(e) => setRating(e.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-label="레이팅"
          className="field py-1.5 text-sm"
        />
      </td>
      <td className="py-2 pr-3">
        <input value={club} onChange={(e) => setClub(e.target.value)} aria-label="소속" className="field py-1.5 text-sm" />
      </td>
      <td className="py-2 pr-3 text-xs text-slate-500" colSpan={checkIn ? 2 : 1}>
        이름을 바꾸면 그 선수가 든 팀의 이름도 함께 바뀝니다.
      </td>
      <td className="py-2 text-right whitespace-nowrap">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSave(name, rating === "" ? null : Number(rating), club)}
          className="btn btn-brand btn-sm px-3"
        >
          저장
        </button>
        <button type="button" onClick={onCancel} className="ml-1 text-xs font-semibold text-slate-500">
          취소
        </button>
      </td>
    </tr>
  );
}

// ───────────────────────── 종목 설정 ─────────────────────────

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
  /** 경기를 시작한 종목은 이름만 고칩니다. */
  locked?: boolean;
  onSubmit: (settings: EventSettings) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initial);
  const set = <K extends keyof EventSettings>(key: K, v: EventSettings[K]) =>
    setValue((current) => ({ ...current, [key]: v }));

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
        <span className="label">경기 방식</span>
        <select
          className="field"
          disabled={locked}
          value={value.bestOf}
          onChange={(e) => set("bestOf", Number(e.target.value))}
        >
          <option value={3}>3게임 2선승</option>
          <option value={5}>5게임 3선승</option>
          <option value={7}>7게임 4선승</option>
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
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-brand btn-sm">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function AddEvent({ busy, run, count }: { busy: boolean; run: Run; count: number }) {
  const [open, setOpen] = useState(count === 0);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline">
        <PlusIcon className="size-5" />
        종목 추가
      </button>
    );
  }
  return (
    <section className="card p-6">
      <h2 className="text-lg font-black text-brand-950">새 종목</h2>
      <p className="mt-1 text-sm break-keep text-slate-500">
        종목마다 참가 팀을 받아 예선 조별 리그를 치르고, 조가 둘 이상이면 본선 토너먼트로 이어집니다.
      </p>
      <div className="mt-5">
        <SettingsForm
          key={count}
          initial={DEFAULT_SETTINGS}
          submitLabel="종목 만들기"
          busy={busy}
          onSubmit={async (settings) => {
            const ok = await run({ op: "addEvent", ...settings }, `'${settings.name}' 종목을 만들었습니다.`);
            if (ok) setOpen(false);
            return ok;
          }}
        />
      </div>
    </section>
  );
}

// ───────────────────────── 종목 카드 ─────────────────────────

function EventCard({
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
  const live = event.status === "live";
  const unit = event.doubles ? "팀" : "명";
  const real = event.matches.filter((m) => !isByeMatch(m));
  const done = real.filter((m) => winnerOf(m, event.bestOf)).length;
  const playing = event.entries.filter((e) => e.absent !== "excluded").length;
  const settings: EventSettings = {
    name: event.name,
    ...(event.nameEn ? { nameEn: event.nameEn } : {}),
    doubles: event.doubles,
    bestOf: event.bestOf,
    groupSize: event.groupSize,
    advance: event.advance,
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-brand-50/60 px-6 py-4">
        <div>
          <h2 className="text-xl font-black text-brand-950">{event.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {event.doubles ? "복식" : "단식"} · {event.bestOf}게임 {Math.floor(event.bestOf / 2) + 1}선승 · 참가{" "}
            {playing}
            {unit}
            {event.groups.length > 0 && ` · ${event.groups.length}개 조`}
            {live && ` · 경기 ${done}/${real.length} 끝남`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            live ? "bg-accent-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {live ? "경기 중" : "준비 중"}
        </span>
      </div>

      <div className="space-y-8 p-6">
        <details className="group">
          <summary className="cursor-pointer text-sm font-bold text-brand-700">종목 설정 바꾸기</summary>
          <div className="mt-4 space-y-4">
            <SettingsForm
              key={JSON.stringify(settings)}
              initial={settings}
              submitLabel="설정 저장"
              busy={busy}
              locked={live}
              onSubmit={(next) => run({ op: "updateEvent", event: event.id, ...next }, "종목 설정을 저장했습니다.")}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`'${event.name}' 종목을 지울까요? 참가 팀과 경기 결과가 모두 지워집니다. (선수 명단은 남습니다)`)) {
                  void run({ op: "removeEvent", event: event.id }, "종목을 지웠습니다.");
                }
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline"
            >
              <TrashIcon className="size-4" />
              종목 지우기
            </button>
          </div>
        </details>

        {live ? (
          <>
            <LiveTeams draw={draw} event={event} busy={busy} run={run} />
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <p className="min-w-0 flex-1 text-sm break-keep text-slate-600">
                경기가 진행 중입니다. 팀이나 조 편성을 바꾸려면 조 편성 단계로 되돌려야 하고, 그러면 입력한 점수가 모두 지워집니다.
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
                className="btn btn-ghost btn-sm text-accent-700"
              >
                조 편성으로 되돌리기
              </button>
            </div>
          </>
        ) : (
          <>
            <TeamsEditor draw={draw} event={event} busy={busy} run={run} />
            <GroupsEditor draw={draw} event={event} busy={busy} run={run} />
            <ConfirmPanel draw={draw} event={event} busy={busy} run={run} checkInHref={checkInHref} />
          </>
        )}
      </div>
    </section>
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

function TeamsEditor({ draw, event, busy, run }: { draw: Draw; event: DrawEvent; busy: boolean; run: Run }) {
  const need = event.doubles ? 2 : 1;
  const free = rosterOf(draw).filter((p) => !teamOf(event, p.name));
  const [picks, setPicks] = useState<string[]>(Array.from({ length: need }, () => ""));
  const unit = event.doubles ? "팀" : "명";

  return (
    <div>
      <h3 className="font-black text-brand-950">1. 참가 {unit}</h3>
      <p className="mt-1 text-sm break-keep text-slate-500">
        선수 명단에서 골라 {event.doubles ? "두 사람을 한 팀으로" : "참가자로"} 넣습니다. 명단에 없는 사람은 위의 선수 명단에 먼저 올려 주세요.
      </p>

      {event.entries.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
          className="btn btn-ghost btn-sm"
        >
          <PlusIcon className="size-4" />
          {unit} 넣기
        </button>
        {free.length === 0 && <span className="text-xs text-slate-400">명단의 모든 선수가 이 종목에 들어 있습니다.</span>}
      </div>

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
      <h3 className="font-black text-brand-950">2. 조 편성 (미리 편성)</h3>
      <p className="mt-1 text-sm break-keep text-slate-500">
        레이팅이 높은 순서로 A조부터 지그재그로 나누고, 같은 소속은 되도록 다른 조에 넣습니다. 레이팅이 없으면 목록 순서를 따릅니다.
        대회 전에 미리 만들어 두면, 대진을 확정할 때 도착하지 않은 팀만 빠집니다.
      </p>
      <button
        type="button"
        disabled={busy || event.entries.length < 2}
        onClick={() => {
          if (!hasGroups || window.confirm("지금 조 편성을 지우고 다시 만들까요?")) {
            void run({ op: "autoGroups", event: event.id }, "조 편성을 만들었습니다.");
          }
        }}
        className="btn btn-ghost btn-sm mt-3"
      >
        {hasGroups ? "조 편성 다시 만들기" : "조 편성 만들기"}
      </button>

      {hasGroups && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

  if (event.entries.length === 0) return null;

  return (
    <div className="rounded-xl bg-brand-50/60 px-4 py-4 sm:px-5">
      <h3 className="font-black text-brand-950">{checkIn ? "3. 체크인 확인과 대진 확정" : "3. 경기 시작"}</h3>

      {checkIn && (
        <>
          <p className="mt-1 text-sm break-keep text-slate-600">
            도착한 {event.doubles ? "팀(두 사람 모두 체크인)" : "선수"}만으로 대진을 확정합니다. 아직 오지 않은{" "}
            {event.doubles ? "팀" : "선수"}은 빼거나, 조에 남겨 두고 기다릴 수 있습니다. 기다리는 {event.doubles ? "팀" : "선수"}의 경기는 도착할 때까지 테이블에 부르지 않습니다.
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
            <ul className="mt-3 divide-y divide-brand-100 rounded-xl border border-brand-100 bg-white">
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
        <div className="mt-4 space-y-2 text-sm break-keep text-slate-700">
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
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
        className="btn btn-accent btn-sm mt-4"
      >
        {checkIn ? "대진 확정하고 경기 시작" : "경기 시작"}
      </button>
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
    <div className="space-y-4">
      {waiting.length > 0 && (
        <div>
          <h3 className="font-black text-brand-950">도착을 기다리는 {unit}</h3>
          <p className="mt-1 text-sm break-keep text-slate-500">
            체크인하면 바로 경기 순서에 들어갑니다. 끝내 오지 않으면 불참 처리해 주세요.
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
          <h3 className="font-black text-brand-950">불참 처리한 {unit}</h3>
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
