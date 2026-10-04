import type { Tournament } from "@/lib/types";
import { statusOf, today, yearOf } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { listTournaments } from "@/lib/store/tournaments";
import { PageHeader } from "@/components/PageHeader";
import { TournamentCard } from "@/components/TournamentCard";

export const metadata = pageMetadata({
  title: "대회 정보",
  description: "버지니아 한인 탁구 협회가 안내하는 탁구대회 일정과 요강입니다.",
});

// 대회의 '예정/종료' 표시가 날짜에 따라 바뀌므로 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export default async function TournamentsPage() {
  const tournaments = await listTournaments();
  const now = today();

  // 예정된 대회는 가까운 날짜부터, 지난 대회는 최근 것부터 보여 줍니다.
  const upcoming = tournaments.filter((t) => statusOf(t, now) !== "past").reverse();
  const past = tournaments.filter((t) => statusOf(t, now) === "past");

  const pastByYear = new Map<number, Tournament[]>();
  for (const tournament of past) {
    const year = yearOf(tournament.startDate);
    pastByYear.set(year, [...(pastByYear.get(year) ?? []), tournament]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Tournaments"
        title="대회 정보"
        description="협회가 주최하거나 함께 참가하는 탁구대회의 일정과 요강을 안내합니다."
      />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <section aria-labelledby="upcoming-heading">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 id="upcoming-heading" className="text-2xl font-black text-brand-950">
              예정된 대회
            </h2>
            {upcoming.length > 0 && (
              <span className="text-sm font-bold text-accent-600">{upcoming.length}건</span>
            )}
          </div>
          {upcoming.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} now={now} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 text-center break-keep text-slate-500">
              현재 예정된 대회가 없습니다. 새 대회 소식이 올라오면 이곳에서 안내해 드립니다.
            </p>
          )}
        </section>

        {past.length > 0 && (
          <section aria-labelledby="past-heading" className="mt-16">
            <h2 id="past-heading" className="mb-6 text-2xl font-black text-brand-950">
              지난 대회
            </h2>
            <div className="space-y-12">
              {[...pastByYear.entries()].map(([year, items]) => (
                <div key={year}>
                  <h3 className="mb-5 flex items-center gap-3 text-lg font-bold text-brand-700">
                    {year}년
                    <span className="h-px flex-1 bg-brand-100" />
                  </h3>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((tournament) => (
                      <TournamentCard key={tournament.id} tournament={tournament} now={now} />
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
