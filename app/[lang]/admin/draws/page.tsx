import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateRange, statusLabel, statusOf, today } from "@/lib/dates";
import { usesCheckIn } from "@/lib/draw/roster";
import { isDrawClosed } from "@/lib/draw/play";
import { drawStage, drawStageLabel } from "@/lib/draw/summary";
import { listDraws } from "@/lib/store/draws";
import { listTournaments } from "@/lib/store/tournaments";
import type { Draw, Tournament } from "@/lib/types";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CheckIcon, ExternalLinkIcon, PlusIcon, TrophyIcon } from "@/components/icons";

type RowProps = {
  tournament: Tournament;
  draw?: Draw;
  now: string;
};

/** 대회 한 줄. 대진표가 있으면 진행 상태와 체크인·방문자 화면 버튼을 함께 보여 줍니다. */
function DrawRow({ tournament, draw, now }: RowProps) {
  const id = tournament.id;
  const past = statusOf(tournament, now) === "past";
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              past ? "bg-slate-100 text-slate-500" : "bg-brand-700 text-white"
            }`}
          >
            {statusLabel(tournament, now)}
          </span>
          {tournament.hidden && (
            <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700 ring-1 ring-accent-200">
              숨김
            </span>
          )}
          {formatDateRange(tournament)}
        </p>
        <p className="mt-1 truncate font-bold text-slate-900">{tournament.title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {draw
            ? `대진표 ${drawStageLabel[drawStage(draw, isDrawClosed(draw, tournament, now))]} · 종목 ${draw.events.length}개`
            : "아직 대진표를 만들지 않았습니다."}
        </p>
      </div>
      {/* 휴대폰에서는 버튼이 넘치지 않게 줄을 바꾸고, 넓은 화면에서는 한 줄로 둡니다. */}
      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <Link href={`/admin/tournaments/${id}/draw`} className="btn btn-brand btn-sm">
          {draw ? <TrophyIcon className="size-4" /> : <PlusIcon className="size-4" />}
          {draw ? "대진표 관리" : "대진표 만들기"}
        </Link>
        {draw && usesCheckIn(draw) && (
          <Link href={`/admin/tournaments/${id}/checkin`} className="btn btn-ghost btn-sm">
            <CheckIcon className="size-4" />
            체크인
          </Link>
        )}
        {/* 숨긴 대회는 방문자용 페이지가 없으므로 링크를 보여 주지 않습니다. */}
        {draw && !tournament.hidden && (
          <a
            href={`/tournaments/${id}/bracket`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
          >
            방문자 화면
            <ExternalLinkIcon className="size-4" />
          </a>
        )}
      </div>
    </li>
  );
}

/** 대회 날 운영자가 대진표·체크인 화면을 바로 찾아 들어가는 목록 */
export default async function AdminDrawsPage() {
  await requireAdmin();
  const [tournaments, draws] = await Promise.all([
    listTournaments({ includeHidden: true }),
    listDraws(),
  ]);
  const now = today();
  const drawOf = new Map(draws.map((draw) => [draw.id, draw]));

  // 목록이 최신순이므로 뒤집어서 가장 가까운 대회가 맨 위에 오게 합니다.
  const upcoming = tournaments.filter((t) => statusOf(t, now) !== "past").reverse();
  // 지난 대회는 대진표를 만든 대회만 보여 줍니다.
  const past = tournaments.filter((t) => statusOf(t, now) === "past" && drawOf.has(t.id));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin/draws" />

      <p className="mt-8 break-keep text-slate-600">
        대회 날 종목·참가 팀 등록, 체크인, 점수 입력을 하는 곳입니다. 대진표는 대회마다 하나씩 만듭니다.
      </p>

      <section className="mt-6" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="mb-4 text-xl font-black text-brand-950">
          다가오는 대회 <span className="text-base font-bold text-slate-400">{upcoming.length}</span>
        </h2>
        {upcoming.length > 0 ? (
          <ul className="card divide-y divide-slate-100">
            {upcoming.map((tournament) => (
              <DrawRow
                key={tournament.id}
                tournament={tournament}
                draw={drawOf.get(tournament.id)}
                now={now}
              />
            ))}
          </ul>
        ) : (
          <div className="card px-6 py-10 text-center break-keep text-slate-500">
            <p>예정된 대회가 없습니다. 대회를 먼저 등록하면 그 대회의 대진표를 만들 수 있습니다.</p>
            <Link href="/admin/tournaments/new" className="btn btn-accent btn-sm mt-4">
              <PlusIcon className="size-4" />새 대회 등록
            </Link>
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-10" aria-labelledby="past-heading">
          <h2 id="past-heading" className="mb-4 text-xl font-black text-brand-950">
            지난 대회 <span className="text-base font-bold text-slate-400">{past.length}</span>
          </h2>
          <ul className="card divide-y divide-slate-100">
            {past.map((tournament) => (
              <DrawRow
                key={tournament.id}
                tournament={tournament}
                draw={drawOf.get(tournament.id)}
                now={now}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
