"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteGameAction, forgetGamePersonAction } from "@/lib/actions";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { GamePerson } from "@/lib/types";
import { CloseIcon, ExternalLinkIcon, TrashIcon } from "@/components/icons";

export type GameListItem = {
  id: string;
  title: string;
  format: "league" | "free";
  /** 만든 날 "2026년 10월 21일 (수)" */
  date: string;
  players: number;
  matches: number;
  open: boolean;
};

const t = getDictionary("ko").games;

/** 관리 화면의 번개 게임 목록과 저장된 이름. 장난으로 만든 게임이나 잘못 들어간 이름을 지웁니다. */
export function GamesAdmin({ games, people }: { games: GameListItem[]; people: GamePerson[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) return setError(result.error);
        router.refresh();
      } catch {
        setError("요청을 처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.");
      }
    });
  }

  const key = query.replace(/\s+/g, "").toLowerCase();
  const shownPeople = key ? people.filter((person) => person.id.includes(key)) : people;

  return (
    <div className="space-y-10">
      {error && (
        <p role="alert" className="rounded-xl bg-accent-50 px-4 py-3 text-sm font-semibold text-accent-700">
          {error}
        </p>
      )}

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="mb-4 text-xl font-black text-brand-950">
          게임 <span className="text-base font-bold text-slate-400">{games.length}</span>
        </h2>
        {games.length > 0 ? (
          <ul className="card divide-y divide-slate-100">
            {games.map((game) => (
              <li key={game.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                      {t.format[game.format]}
                    </span>
                    {!game.open && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">마감</span>
                    )}
                    {game.date}
                  </p>
                  <p className="mt-1 truncate font-bold text-slate-900">{game.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    선수 {game.players}명 · 경기 {game.matches}개 · 주소 /games/{game.id}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                  <a href={`/games/${game.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    보기
                    <ExternalLinkIcon className="size-4" />
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(`"${game.title}" 게임과 기록을 모두 지울까요? 되돌릴 수 없습니다.`)) {
                        run(async () => {
                          const result = await deleteGameAction(game.id);
                          return result.error ? { error: t.errors[result.error] } : {};
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50"
                  >
                    <TrashIcon className="size-4" />
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card px-6 py-10 text-center text-slate-500">아직 만든 게임이 없습니다.</p>
        )}
      </section>

      <section aria-labelledby="people-heading">
        <h2 id="people-heading" className="text-xl font-black text-brand-950">
          저장된 이름 <span className="text-base font-bold text-slate-400">{people.length}</span>
        </h2>
        <p className="mt-1 mb-4 text-sm break-keep text-slate-500">
          게임을 만들거나 경기를 적을 때 찾아 고르는 이름입니다. 지워도 그 이름이 나온 게임 기록은 그대로 남고, 다시 쓰면 다시 저장됩니다.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 찾기"
          aria-label="이름 찾기"
          className="field mb-3 max-w-xs"
        />
        <ul className="flex flex-wrap gap-1.5">
          {shownPeople.map((person) => (
            <li
              key={person.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pr-1 pl-3 text-sm font-semibold text-slate-700"
            >
              {person.name}
              <button
                type="button"
                disabled={pending}
                aria-label={`${person.name} 지우기`}
                onClick={() => {
                  if (window.confirm(`저장된 이름에서 "${person.name}"을(를) 지울까요?`)) {
                    run(() => forgetGamePersonAction(person.id));
                  }
                }}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-accent-50 hover:text-accent-700"
              >
                <CloseIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
