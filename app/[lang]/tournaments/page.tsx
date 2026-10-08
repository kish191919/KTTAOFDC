import type { Metadata } from "next";
import type { Tournament } from "@/lib/types";
import { statusOf, today, yearOf } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeTournament } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { listTournaments } from "@/lib/store/tournaments";
import { PageHeader } from "@/components/PageHeader";
import { TournamentCard } from "@/components/TournamentCard";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const t = getDictionary(lang).tournaments;
  return pageMetadata({
    lang,
    path: "/tournaments",
    title: t.metaTitle,
    description: t.metaDescription,
  });
}

// 대회의 '예정/종료' 표시가 날짜에 따라 바뀌므로 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export default async function TournamentsPage({ params }: Props) {
  const lang = await readLang(params);
  const t = getDictionary(lang).tournaments;
  const tournaments = (await listTournaments()).map((item) => localizeTournament(item, lang));
  const now = today();

  // 예정된 대회는 가까운 날짜부터, 지난 대회는 최근 것부터 보여 줍니다.
  const upcoming = tournaments.filter((item) => statusOf(item, now) !== "past").reverse();
  const past = tournaments.filter((item) => statusOf(item, now) === "past");

  const pastByYear = new Map<number, Tournament[]>();
  for (const tournament of past) {
    const year = yearOf(tournament.startDate);
    pastByYear.set(year, [...(pastByYear.get(year) ?? []), tournament]);
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <section aria-labelledby="upcoming-heading">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 id="upcoming-heading" className="text-2xl font-black text-brand-950">
              {t.upcoming}
            </h2>
            {upcoming.length > 0 && (
              <span className="text-sm font-bold text-accent-600">
                {t.count(upcoming.length)}
              </span>
            )}
          </div>
          {upcoming.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  now={now}
                  lang={lang}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 text-center break-keep text-slate-500">
              {t.upcomingEmpty}
            </p>
          )}
        </section>

        {past.length > 0 && (
          <section aria-labelledby="past-heading" className="mt-16">
            <h2 id="past-heading" className="mb-6 text-2xl font-black text-brand-950">
              {t.past}
            </h2>
            {/* 지난 대회는 휴대폰 화면에서 포스터 없이 간단한 목록으로 보여 줍니다. */}
            <div className="space-y-8 sm:space-y-12">
              {[...pastByYear.entries()].map(([year, items]) => (
                <div key={year}>
                  <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-brand-700 sm:mb-5">
                    {t.year(year)}
                    <span className="h-px flex-1 bg-brand-100" />
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                    {items.map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                        now={now}
                        lang={lang}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
