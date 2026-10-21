"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createGameAction } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { GAME_BEST_OF, MAX_GAME_TITLE, MIN_LEAGUE_ENTRIES, type NewGameInput } from "@/lib/games/play";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Game } from "@/lib/types";
import { CloseIcon } from "@/components/icons";
import { NamePicker } from "./NamePicker";
import { ownerKeyStorage } from "./usePeople";

/** 새 게임에서 고를 수 있는 테이블 수 (더 많으면 만든 뒤 게임 관리에서 바꿉니다) */
const TABLE_CHOICES = [0, 1, 2, 3, 4, 5, 6, 8];

/**
 * 새 친선 경기 만들기. 방식(리그전·자유 기록), 참가자, 경기 방식, 테이블을 고르면 바로 게임 화면으로 갑니다.
 * 만든 사람 열쇠는 이 휴대폰에 남겨, 이 휴대폰에서는 게임을 관리할 수 있게 합니다.
 */
export function NewGameForm({
  lang,
  people,
  today,
}: {
  lang: Locale;
  /** 저장된 이름 (최근에 쓴 순서) */
  people: string[];
  /** 오늘 날짜 (YYYY-MM-DD). 게임 이름을 비워 두면 이 날짜로 이름을 붙입니다. */
  today: string;
}) {
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const router = useRouter();
  const [format, setFormat] = useState<Game["format"]>("league");
  const [doubles, setDoubles] = useState(false);
  const [bestOf, setBestOf] = useState(5);
  const [tables, setTables] = useState(0);
  const [title, setTitle] = useState("");
  /** 고른 이름 (리그전 복식은 고른 순서대로 두 사람씩 한 팀) */
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const league = format === "league";
  const pairSize = league && doubles ? 2 : 1;
  const entries = Array.from({ length: Math.ceil(names.length / pairSize) }, (_, i) =>
    names.slice(i * pairSize, i * pairSize + pairSize),
  );
  const defaultTitle = t.defaultTitle(formatDate(today, false, lang), t.format[format]);

  function shuffle() {
    const next = [...names];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setNames(next);
  }

  function submit() {
    setError(null);
    if (pairSize === 2 && names.length % 2 === 1) return setError(t.needPartner);
    if (league && entries.length < MIN_LEAGUE_ENTRIES) return setError(t.leagueMin);
    const input: NewGameInput = {
      title: title.trim() || defaultTitle,
      format,
      doubles: league && doubles,
      bestOf,
      tables,
      entries,
    };
    startTransition(async () => {
      try {
        const result = await createGameAction(input);
        if ("error" in result) return setError(t.errors[result.error]);
        try {
          window.localStorage.setItem(ownerKeyStorage(result.id), result.key);
        } catch {
          // 저장이 막힌 브라우저: 이 휴대폰에서는 관리할 수 없지만 게임은 그대로 씁니다.
        }
        router.push(localePath(lang, `/games/${result.id}`));
      } catch {
        setError(t.errors.network);
      }
    });
  }

  const choice = (active: boolean) =>
    `rounded-xl border-2 px-4 py-3 text-left transition-colors ${
      active ? "border-brand-700 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-200"
    }`;
  const segment = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
      active ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-brand-700"
    }`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-8"
    >
      <fieldset>
        <legend className="label">{t.formatLabel}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["league", "free"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={choice(format === value)}>
              <span className="block font-black text-brand-950">{t.format[value]}</span>
              <span className="mt-0.5 block text-sm break-keep text-slate-500">{t.formatHint[value]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-semibold text-slate-700">
            {t.entriesLabel}
            {names.length > 0 && (
              <span className="ml-1.5 text-slate-400">
                {pairSize === 2 ? t.teams(entries.length) : t.people(names.length)}
              </span>
            )}
          </legend>
          {league && (
            <div className="flex w-40 gap-1 rounded-xl bg-slate-100 p-1">
              <button type="button" aria-pressed={!doubles} onClick={() => setDoubles(false)} className={segment(!doubles)}>
                {t.singles}
              </button>
              <button type="button" aria-pressed={doubles} onClick={() => setDoubles(true)} className={segment(doubles)}>
                {t.doubles}
              </button>
            </div>
          )}
        </div>

        {names.length > 0 && (
          <ol className="mb-3 flex flex-wrap gap-1.5">
            {entries.map((entry, i) => (
              <li
                key={entry.join("|")}
                className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1.5 pr-1.5 pl-3 text-sm font-bold text-brand-900"
              >
                {pairSize === 2 && <span className="mr-0.5 text-xs font-semibold text-brand-500">{t.teamNo(i + 1)}</span>}
                {entry.map((name, k) => (
                  <span key={name} className="inline-flex items-center">
                    {k > 0 && <span className="mx-1 text-brand-300">·</span>}
                    {name}
                    <button
                      type="button"
                      aria-label={t.remove(name)}
                      onClick={() => setNames(names.filter((n) => n !== name))}
                      className="ml-0.5 rounded-full p-0.5 text-brand-400 hover:text-brand-700"
                    >
                      <CloseIcon className="size-4" />
                    </button>
                  </span>
                ))}
                {entry.length < pairSize && <span className="px-1 font-semibold text-slate-400">· ?</span>}
              </li>
            ))}
          </ol>
        )}

        <NamePicker lang={lang} taken={names} people={people} onPick={(picked) => setNames([...names, ...picked])} />
        {pairSize === 2 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm break-keep text-slate-500">{t.pairHint}</p>
            {names.length > 2 && (
              <button type="button" onClick={shuffle} className="text-sm font-bold text-brand-700 hover:underline">
                {t.shufflePairs}
              </button>
            )}
          </div>
        )}
        {!league && <p className="hint break-keep">{t.freePlayersHint}</p>}
      </fieldset>

      <div className="grid gap-8 sm:grid-cols-2">
        <fieldset>
          <legend className="label">{t.bestOfLabel}</legend>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {GAME_BEST_OF.map((n) => (
              <button key={n} type="button" aria-pressed={bestOf === n} onClick={() => setBestOf(n)} className={segment(bestOf === n)}>
                {d.bestOf(n)}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">{t.tablesLabel}</legend>
          <div className="flex flex-wrap gap-1.5">
            {TABLE_CHOICES.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={tables === n}
                onClick={() => setTables(n)}
                className={`min-w-11 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                  tables === n
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50"
                }`}
              >
                {n === 0 ? t.tablesNone : n}
              </button>
            ))}
          </div>
          <p className="hint break-keep">{t.tablesHint}</p>
        </fieldset>
      </div>

      <div>
        <label htmlFor="game-title" className="label">
          {t.titleLabel}
        </label>
        <input
          id="game-title"
          value={title}
          maxLength={MAX_GAME_TITLE}
          placeholder={defaultTitle}
          onChange={(e) => setTitle(e.target.value)}
          className="field"
        />
        <p className="hint">{t.titleHint}</p>
      </div>

      <div>
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold break-keep text-accent-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn btn-accent w-full sm:w-auto">
          {pending ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
