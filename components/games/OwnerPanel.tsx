"use client";

import { useId, useState, useTransition } from "react";
import { deleteGameAction, gameAction } from "@/lib/actions";
import {
  MAX_GAME_TABLES,
  MAX_GAME_TITLE,
  OPEN_DAYS,
  sideKey,
  sideName,
  type GameOp,
  type GamePayload,
  type PublicGame,
} from "@/lib/games/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ChevronDownIcon, CloseIcon, CopyIcon, TrashIcon } from "@/components/icons";
import { NamePicker } from "./NamePicker";

/**
 * 게임 관리. 게임을 만든 휴대폰(관리 열쇠가 있는 휴대폰)이나 관리자에게만 보입니다.
 * 게임 이름·테이블 수 바꾸기, 참가자 더하기·이름 고치기·빼기, 기록 마감·다시 열기, 관리 링크, 게임 지우기.
 */
export function OwnerPanel({
  lang,
  game,
  open,
  ownerKey,
  admin,
  onSaved,
  onDeleted,
}: {
  lang: Locale;
  game: PublicGame;
  open: boolean;
  ownerKey: string | null;
  admin: boolean;
  onSaved: (payload: GamePayload) => void;
  onDeleted: () => void;
}) {
  const t = getDictionary(lang).games;
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const [title, setTitle] = useState(game.title);
  const [tables, setTables] = useState(game.tables);
  /** 이름을 고치고 있는 선수 */
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  /** 더할 참가자 이름 (리그전 복식은 두 사람씩 한 팀) */
  const [adding, setAdding] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const league = game.format === "league";
  const pairSize = league && game.doubles ? 2 : 1;

  function run(op: GameOp, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await gameAction(game.id, op, ownerKey ?? undefined);
        if ("error" in result) return setError(t.errors[result.error]);
        onSaved(result);
        after?.();
      } catch {
        setError(t.errors.network);
      }
    });
  }

  function remove() {
    if (!window.confirm(t.deleteConfirm)) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteGameAction(game.id, ownerKey ?? undefined);
        if (result.error) return setError(t.errors[result.error]);
        onDeleted();
      } catch {
        setError(t.errors.network);
      }
    });
  }

  async function copyOwnerLink() {
    const url = `${window.location.origin}${window.location.pathname}#key=${ownerKey}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t.ownerLink, url);
    }
  }

  // 리그전은 팀(단식은 한 사람)마다 한 줄, 자유 기록은 한 사람씩
  const groups = league ? game.teams : game.players.map((p) => [p.id]);
  const matchesOf = (ids: string[]) => game.matches.filter((m) => [...m.a, ...m.b].some((id) => ids.includes(id))).length;
  const addingEntries = Array.from({ length: Math.ceil(adding.length / pairSize) }, (_, i) =>
    adding.slice(i * pairSize, i * pairSize + pairSize),
  );
  const addingComplete = adding.length > 0 && adding.length % pairSize === 0;

  const smallButton =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-60";

  return (
    <section aria-labelledby={`${panelId}-heading`} className="card overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50 px-5 py-4 text-left"
      >
        <span>
          <span id={`${panelId}-heading`} className="block font-black text-brand-950">
            {t.manage}
          </span>
          <span className="mt-0.5 block text-xs break-keep text-slate-500">
            {admin && !ownerKey ? t.manageAdmin : t.manageHint}
          </span>
        </span>
        <ChevronDownIcon className={`size-5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <div id={panelId} hidden={!expanded} className="space-y-7 px-5 py-5">
        {error && (
          <p role="alert" className="rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
            {error}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run({ op: "title", title });
            }}
          >
            <label htmlFor={`${panelId}-title`} className="label">
              {t.titleLabel}
            </label>
            <div className="flex gap-2">
              <input
                id={`${panelId}-title`}
                value={title}
                maxLength={MAX_GAME_TITLE}
                onChange={(e) => setTitle(e.target.value)}
                className="field"
              />
              <button type="submit" disabled={pending || title.trim() === game.title} className="btn btn-ghost btn-sm shrink-0">
                {t.rename}
              </button>
            </div>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run({ op: "tables", tables });
            }}
          >
            <label htmlFor={`${panelId}-tables`} className="label">
              {t.tablesLabel}
            </label>
            <div className="flex gap-2">
              <select
                id={`${panelId}-tables`}
                value={tables}
                onChange={(e) => setTables(Number(e.target.value))}
                className="field"
              >
                {Array.from({ length: MAX_GAME_TABLES + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n === 0 ? t.tablesNone : n}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={pending || tables === game.tables} className="btn btn-ghost btn-sm shrink-0">
                {t.rename}
              </button>
            </div>
          </form>
        </div>

        <div>
          <p className="label">{t.entriesLabel}</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {groups.map((ids, index) => (
              <li key={sideKey(ids)} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
                {league && game.doubles && <span className="text-xs font-bold text-slate-400">{t.teamNo(index + 1)}</span>}
                {ids.map((id) => {
                  const player = game.players.find((p) => p.id === id);
                  if (!player) return null;
                  return editing?.id === id ? (
                    <form
                      key={id}
                      className="flex w-full gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        run({ op: "renamePlayer", player: id, name: editing.name }, () => setEditing(null));
                      }}
                    >
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ id, name: e.target.value })}
                        aria-label={t.renamePlayer}
                        className="field py-1.5"
                      />
                      <button type="submit" disabled={pending} className="btn btn-brand btn-sm shrink-0">
                        {t.save}
                      </button>
                      <button type="button" onClick={() => setEditing(null)} aria-label={t.close} className="shrink-0 p-1 text-slate-400">
                        <CloseIcon className="size-5" />
                      </button>
                    </form>
                  ) : (
                    <span key={id} className="inline-flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{player.name}</span>
                      <button type="button" onClick={() => setEditing({ id, name: player.name })} className={smallButton}>
                        {t.renamePlayer}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm(t.removePlayerConfirm(sideName(game, ids), matchesOf(ids)))) {
                      run({ op: "removePlayer", player: ids[0] });
                    }
                  }}
                  className={`${smallButton} ml-auto text-accent-700`}
                >
                  {t.removePlayer}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="label">{t.addEntries}</p>
          {league && <p className="mb-2 text-xs break-keep text-slate-500">{t.addEntriesHint}</p>}
          {adding.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {addingEntries.map((names, i) => (
                <li key={i} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-900">
                  {names.join(" · ")}
                  {names.length < pairSize && <span className="font-semibold text-slate-400">· ?</span>}
                  <button
                    type="button"
                    aria-label={t.remove(names.join(", "))}
                    onClick={() => setAdding(adding.filter((name) => !names.includes(name)))}
                    className="-mr-1 rounded-full p-0.5 text-brand-400 hover:text-brand-700"
                  >
                    <CloseIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <NamePicker
            lang={lang}
            taken={[...game.players.map((p) => p.name), ...adding]}
            onPick={(names) => setAdding([...adding, ...names])}
            hint={false}
          />
          {pairSize === 2 && adding.length % 2 === 1 && <p className="hint">{t.needPartner}</p>}
          <button
            type="button"
            disabled={pending || !addingComplete}
            onClick={() =>
              run({ op: "addEntries", entries: addingEntries }, () => setAdding([]))
            }
            className="btn btn-brand btn-sm mt-3"
          >
            {t.add}
          </button>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(game.closed || !open ? { op: "reopen" } : { op: "close" })}
              className="btn btn-ghost btn-sm"
            >
              {game.closed || !open ? t.reopenGame : t.closeGame}
            </button>
            {ownerKey && (
              <button type="button" onClick={copyOwnerLink} className="btn btn-ghost btn-sm">
                <CopyIcon className="size-4" />
                {copied ? t.copied : t.ownerLink}
              </button>
            )}
            <button type="button" disabled={pending} onClick={remove} className="btn btn-ghost btn-sm text-accent-700">
              <TrashIcon className="size-4" />
              {t.deleteGame}
            </button>
          </div>
          <p className="text-xs break-keep text-slate-500">{t.closeHint(OPEN_DAYS)}</p>
          {ownerKey && <p className="text-xs break-keep text-slate-500">{t.ownerLinkHint}</p>}
        </div>
      </div>
    </section>
  );
}
