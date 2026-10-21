import type { Metadata } from "next";
import Link from "next/link";
import { today } from "@/lib/dates";
import { personKey } from "@/lib/draw/roster";
import { isGameOpen, publicGame, rowOf, summarize } from "@/lib/games/play";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { listGamesWith, listPeople, listRecentGames } from "@/lib/store/games";
import { GameCard } from "@/components/games/GameCard";
import { GameFinder, SaveMeButton } from "@/components/games/GameFinder";
import { PageHeader } from "@/components/PageHeader";
import { PlusIcon } from "@/components/icons";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
};

/** 최근 게임 목록에 보여 주는 수 */
const RECENT = 30;

// 경기 결과가 계속 바뀌므로 열 때마다 새로 그립니다.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const t = getDictionary(lang).games;
  return {
    ...pageMetadata({ lang, path: "/games", title: t.title, description: t.metaDescription }),
    // 회원들의 이름과 성적이 나오는 곳이라 검색 결과에는 내보내지 않습니다.
    robots: { index: false },
  };
}

/** 번개 게임 홈: 새 게임 만들기, 이름으로 기록 찾기, 최근 게임 */
export default async function GamesPage({ params, searchParams }: Props) {
  const lang = await readLang(params);
  const t = getDictionary(lang).games;
  const { name } = await searchParams;
  const query = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 40) : "";
  const [recent, found, people] = await Promise.all([
    listRecentGames(RECENT),
    query ? listGamesWith(query) : Promise.resolve([]),
    listPeople(),
  ]);
  const now = today();

  // 찾은 사람의 게임별 성적과 합계
  const key = personKey(query);
  const results = found.map((game) => ({ game, row: rowOf(game, summarize(game), key) }));
  const wins = results.reduce((sum, { row }) => sum + (row?.wins ?? 0), 0);
  const losses = results.reduce((sum, { row }) => sum + (row?.losses ?? 0), 0);
  const shownName = found[0]?.players.find((p) => personKey(p.name) === key)?.name ?? query;

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description}>
        <Link href={localePath(lang, "/games/new")} className="btn btn-accent mt-8">
          <PlusIcon className="size-5" />
          {t.create}
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-12">
        <GameFinder lang={lang} people={people.map((person) => person.name)} current={query} />

        {query && (
          <section aria-labelledby="person-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="person-heading" className="text-xl font-black break-keep text-brand-950">
                  {t.personTitle(shownName)}
                </h2>
                {found.length > 0 && (
                  <p className="mt-1 text-sm font-semibold text-slate-500">{t.personSummary(found.length, wins, losses)}</p>
                )}
              </div>
              {found.length > 0 && <SaveMeButton lang={lang} name={shownName} />}
            </div>
            {found.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {results.map(({ game, row }) => (
                  <GameCard
                    key={game.id}
                    lang={lang}
                    game={publicGame(game)}
                    open={isGameOpen(game, now)}
                    record={row}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t.personEmpty(query)}</p>
            )}
          </section>
        )}

        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="text-xl font-black text-brand-950">
            {t.recent}
          </h2>
          {recent.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {recent.map((game) => (
                <GameCard key={game.id} lang={lang} game={publicGame(game)} open={isGameOpen(game, now)} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 text-center break-keep text-slate-500">
              {t.recentEmpty}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
