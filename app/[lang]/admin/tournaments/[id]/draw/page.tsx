import Link from "next/link";
import { notFound } from "next/navigation";
import { createDrawAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatSchedule, today } from "@/lib/dates";
import { canVisitorsScore } from "@/lib/draw/play";
import { getDraw } from "@/lib/store/draws";
import { getTournament } from "@/lib/store/tournaments";
import { DrawManager } from "@/components/admin/DrawManager";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

export default async function DrawAdminPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [tournament, draw] = await Promise.all([
    getTournament(id, { includeHidden: true }),
    getDraw(id),
  ]);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <Link
        href={`/admin/tournaments/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        대회 정보 수정
      </Link>
      <h1 className="mt-4 text-3xl font-black text-brand-950">대진표 관리</h1>
      <p className="mt-1 mb-8 break-keep text-slate-500">
        {tournament.title} · {formatSchedule(tournament, "ko")}
        {tournament.hidden && " · 방문자에게 숨긴 대회"}
      </p>

      {draw ? (
        <DrawManager
          tournamentId={id}
          initial={{ draw, scoring: canVisitorsScore(draw, tournament, today()) }}
          renderedAt={new Date().toISOString()}
          publicHref={`/tournaments/${id}/bracket`}
        />
      ) : (
        <form action={createDrawAction.bind(null, id)} className="card max-w-2xl p-6">
          <h2 className="text-lg font-black text-brand-950">이 대회의 대진표 만들기</h2>
          <p className="mt-2 text-sm leading-relaxed break-keep text-slate-600">
            종목을 만들고 참가자를 붙여 넣으면 레이팅 순서로 예선 조를 나누고, 조별 리그와 본선 토너먼트 경기를 만듭니다.
            대회 날에는 누구나 휴대폰으로 점수를 입력하고, 빈 테이블에 다음 경기가 자동으로 배정됩니다.
          </p>
          <button type="submit" className="btn btn-brand mt-5">
            대진표 만들기
          </button>
        </form>
      )}
    </div>
  );
}
