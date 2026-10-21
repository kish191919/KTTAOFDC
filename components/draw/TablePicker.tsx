"use client";

import { useState, useTransition } from "react";
import { setDrawTableAction } from "@/lib/actions";
import { occupantKey, tableChoices, type EventContext, type QueueItem, type TableBoard } from "@/lib/draw/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Draw } from "@/lib/types";
import { Dialog } from "./Dialog";
import { eventName, matchLabel, sideName } from "./labels";
import { MatchSides, type MatchSide } from "./MatchSides";

/**
 * 빈 테이블에서 시작할 수 있는 경기. 본선 경기를 먼저 놓습니다.
 * 조 테이블이 비어 있는 예선 경기는 그 테이블에서 치므로 넣지 않습니다.
 * (4팀 조가 두 경기를 동시에 칠 때처럼 조 테이블을 쓰고 있는 경기만 넣습니다)
 */
export function startableAt(
  draw: Draw,
  board: TableBoard,
  contexts: EventContext[],
  table: number,
  admin: boolean,
): QueueItem[] {
  return board.queue
    .filter(({ event, match }) => {
      const choices = tableChoices(draw, board, event, match, admin, contexts);
      if (choices.home && !choices.home.replaces && choices.home.table !== table) return false;
      return choices.home?.table === table || choices.free.includes(table);
    })
    .sort((x, y) => Number(x.match.stage === "group") - Number(y.match.stage === "group"));
}

/**
 * 경기가 없는 테이블에서 칠 경기를 고르는 창. 고르면 그 테이블에서 시작합니다.
 * 선수가 다른 경기 중이거나 도착 확인 전인 경기는 고를 수 없습니다.
 * 조 테이블이면 그런 경기도 까닭과 함께 흐리게 보여 줍니다. (테이블 현황에는 조의 경기 목록이 없습니다)
 */
export function TablePicker({
  tournamentId,
  lang,
  draw,
  board,
  contexts,
  table,
  admin,
  onSaved,
  onConflict,
  onClose,
}: {
  tournamentId: string;
  lang: Locale;
  draw: Draw;
  board: TableBoard;
  contexts: EventContext[];
  table: number;
  admin: boolean;
  onSaved: (draw: Draw) => void;
  onConflict: () => void;
  onClose: () => void;
}) {
  const t = getDictionary(lang).draw;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const items = startableAt(draw, board, contexts, table, admin);
  const groups = board.tables[table - 1]?.groups ?? [];
  const held = board.queue.filter(
    (item) =>
      !items.includes(item) &&
      item.match.stage === "group" &&
      groups.some(({ event, group }) => event === item.event && (item.match.group ?? 0) === group),
  );

  function pick(eventId: string, matchId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setDrawTableAction(tournamentId, {
          event: eventId,
          match: matchId,
          table,
          occupant: occupantKey(board.tables[table - 1]),
        });
        if ("error" in result) {
          setError(t.errors[result.error]);
          if (result.error === "tableTaken") onConflict();
          return;
        }
        onSaved(result.draw);
        onClose();
      } catch {
        setError(t.errors.network);
      }
    });
  }

  const row = ({ event, match }: QueueItem, note?: string) => {
    const context = contexts[draw.events.indexOf(event)];
    const sides = (["a", "b"] as const).map((side) => {
      const { name, entry } = sideName(match, side, context, t);
      return { name, decided: Boolean(entry) };
    }) as [MatchSide, MatchSide];
    const usable = note === undefined;
    return (
      <li key={`${event.id}:${match.id}`}>
        <button
          type="button"
          disabled={pending || !usable}
          onClick={() => pick(event.id, match.id)}
          className="block w-full px-3.5 py-3 text-left transition-colors enabled:hover:bg-brand-50/60 disabled:cursor-default"
        >
          <span className="mb-1.5 block text-xs font-bold text-slate-400">
            {eventName(event, lang)} · {matchLabel(event, match, t)}
            {note && <span className="text-accent-700"> · {note}</span>}
          </span>
          <span className={`block ${usable ? "" : "opacity-45"}`}>
            <MatchSides sides={sides} versus={t.versus} size="compact" />
          </span>
        </button>
      </li>
    );
  };

  return (
    <Dialog eyebrow={t.startMatch} title={t.pickTitle(t.table(table))} closeLabel={t.score.close} onClose={onClose}>
      {items.length === 0 && held.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm break-keep text-slate-600">{t.pickEmpty}</p>
      ) : (
        <>
          <p className="mt-1 text-sm break-keep text-slate-500">{groups.length > 0 ? t.pickGroupHint : t.pickHint}</p>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
              {error}
            </p>
          )}
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {items.slice(0, 40).map((item) => row(item))}
            {held.map((item) => row(item, item.absent ? t.notArrived : t.playerBusy))}
          </ul>
        </>
      )}
    </Dialog>
  );
}
