"use client";

import { useState } from "react";
import { drawAdminAction } from "@/lib/actions";
import { entryName } from "@/lib/draw/entries";
import { personKey, presence, rosterOf, teamOf } from "@/lib/draw/roster";
import type { DrawPayload } from "@/lib/draw/view";
import type { DrawPlayer } from "@/lib/types";
import { clockTime } from "@/components/draw/labels";
import { useLiveDraw } from "@/components/draw/useLiveDraw";
import { CheckIcon, PlusIcon, SearchIcon } from "@/components/icons";

type Props = {
  tournamentId: string;
  initial: DrawPayload;
  renderedAt: string;
};

type Filter = "all" | "waiting" | "arrived";

/**
 * 접수 데스크의 체크인 화면. 선수 이름을 찾아 '도착'을 누릅니다.
 * 다른 데스크에서 누른 것도 5초마다 받아 와 맞춥니다.
 */
export function CheckInDesk({ tournamentId, initial, renderedAt }: Props) {
  const { payload, online, checkedAt, setPayload } = useLiveDraw(tournamentId, initial);
  const draw = payload.draw;
  const closed = payload.closed;
  const roster = rosterOf(draw);
  const isPresent = presence(draw);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  async function send(op: Parameters<typeof drawAdminAction>[1], target: string) {
    setPending(target);
    setError(null);
    try {
      const result = await drawAdminAction(tournamentId, op);
      if ("error" in result) {
        setError(result.error);
        return false;
      }
      setPayload(result);
      return true;
    } catch {
      setError("저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.");
      return false;
    } finally {
      setPending(null);
    }
  }

  function toggle(player: DrawPlayer) {
    if (player.checkedInAt && !window.confirm(`${player.name} 님의 도착 표시를 취소할까요?`)) return;
    void send({ op: "checkIn", player: player.id, value: !player.checkedInAt }, player.id);
  }

  const key = personKey(query);
  const arrived = roster.filter((p) => p.checkedInAt).length;
  const shown = roster
    .filter((p) => !key || personKey(p.name).includes(key))
    .filter((p) => (filter === "all" ? true : filter === "arrived" ? p.checkedInAt : !p.checkedInAt))
    .sort((x, y) => x.name.localeCompare(y.name, "ko"));

  return (
    <div className="space-y-5">
      {closed ? (
        <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
          마감한 대진표입니다. 도착 표시를 바꿀 수 없습니다. 고치려면 대진표 관리에서 ‘마감 풀기’를 눌러 주세요.
        </p>
      ) : (
        <p className={`text-sm ${online ? "text-slate-500" : "font-bold text-accent-600"}`}>
          <span suppressHydrationWarning>
            {online
              ? `${clockTime(checkedAt ?? renderedAt, "ko", true)} 기준 · 다른 데스크에서 누른 것도 5초마다 맞춰집니다`
              : "연결이 끊겼습니다. 다시 연결하는 중입니다…"}
          </span>
        </p>
      )}

      <section className="card p-5">
        <p className="text-3xl font-black text-brand-950 tabular-nums">
          {arrived}
          <span className="text-lg text-slate-400"> / {roster.length}명 도착</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          {draw.events.map((event) => {
            const teams = event.entries.filter((e) => e.absent !== "excluded");
            const here = teams.filter(isPresent).length;
            return (
              <li key={event.id}>
                <strong className="text-slate-800">{event.name}</strong> {event.doubles ? "팀" : "선수"} {here}/{teams.length}
                {event.status === "live" && <span className="ml-1 text-accent-600">· 경기 중</span>}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sticky top-16 z-10 -mx-4 space-y-2 bg-brand-50/95 px-4 py-2 backdrop-blur sm:top-20">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름으로 찾기"
            aria-label="선수 이름으로 찾기"
            className="field py-3 pl-11 text-lg"
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["all", "전체"],
              ["waiting", "아직"],
              ["arrived", "도착"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                filter === value ? "bg-brand-700 text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-accent-50 px-4 py-2 text-sm font-semibold text-accent-700">
            {error}
          </p>
        )}
      </div>

      <ul className="space-y-2">
        {shown.map((player) => {
          const teams = draw.events.flatMap((event) => {
            const entry = teamOf(event, player.name);
            if (!entry) return [];
            const partners = entry.players.filter((n) => personKey(n) !== personKey(player.name));
            const partnerHere = partners.map((n) => roster.find((p) => personKey(p.name) === personKey(n))?.checkedInAt);
            return [{ event, entry, partners, partnerHere }];
          });
          return (
            <li key={player.id}>
              <button
                type="button"
                disabled={closed || pending === player.id}
                onClick={() => toggle(player)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-colors disabled:opacity-60 ${
                  player.checkedInAt
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    player.checkedInAt ? "bg-white text-brand-700" : "border-2 border-slate-300"
                  }`}
                >
                  {player.checkedInAt && <CheckIcon className="size-6" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-black break-keep">{player.name}</span>
                  <span className={`block text-sm break-keep ${player.checkedInAt ? "text-brand-100" : "text-slate-500"}`}>
                    {teams.length === 0
                      ? "들어 있는 팀 없음"
                      : teams
                          .map(({ event, partners, partnerHere }) =>
                            partners.length > 0
                              ? `${event.name} · 짝 ${partners.map((n, i) => `${n}${partnerHere[i] ? " ✓" : ""}`).join(", ")}`
                              : event.name,
                          )
                          .join(" / ")}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm font-bold">
                  {player.checkedInAt ? clockTime(player.checkedInAt, "ko") : "도착"}
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-6 text-center text-slate-500">찾는 선수가 없습니다.</li>}
      </ul>

      <form
        className="card flex flex-wrap items-end gap-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          if (await send({ op: "addPlayers", text: newName }, "new")) {
            setQuery(newName.split(",")[0].trim());
            setNewName("");
          }
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="label">명단에 없는 선수 올리기 (당일 신청)</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="이름, 레이팅 (예: 홍길동, 650)"
            className="field"
          />
        </label>
        <button type="submit" disabled={closed || pending === "new"} className="btn btn-ghost btn-sm mb-1">
          <PlusIcon className="size-4" />
          올리기
        </button>
        <p className="hint w-full break-keep">
          팀 짓기는 대진표 관리 화면에서 합니다. 이미 경기를 시작한 종목에는 새 팀을 넣을 수 없습니다.
        </p>
      </form>

      {draw.events.some((event) => event.entries.some((e) => !isPresent(e) && e.absent !== "excluded")) && (
        <section className="card p-5">
          <h2 className="font-black text-brand-950">아직 다 오지 않은 팀</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {draw.events.flatMap((event) =>
              event.entries
                .filter((e) => !isPresent(e) && e.absent !== "excluded")
                .map((entry) => (
                  <li key={`${event.id}:${entry.id}`}>
                    <span className="font-semibold text-slate-800">{event.name}</span> · {entryName(entry)}
                  </li>
                )),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
