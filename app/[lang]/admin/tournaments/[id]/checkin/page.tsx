import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { today } from "@/lib/dates";
import { drawPayload } from "@/lib/draw/view";
import { getDraw } from "@/lib/store/draws";
import { getTournament } from "@/lib/store/tournaments";
import { CheckInDesk } from "@/components/admin/CheckInDesk";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

/** 대회 날 접수 데스크에서 선수 도착을 확인하는 화면 */
export default async function CheckInPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const [tournament, draw] = await Promise.all([
    getTournament(id, { includeHidden: true }),
    getDraw(id),
  ]);
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <Link
        href={`/admin/tournaments/${id}/draw`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        대진표 관리
      </Link>
      <h1 className="mt-4 text-3xl font-black text-brand-950">체크인</h1>
      <p className="mt-1 mb-6 break-keep text-slate-500">{tournament.title}</p>
      {draw ? (
        <CheckInDesk
          tournamentId={id}
          initial={drawPayload(draw, tournament, today())}
          renderedAt={new Date().toISOString()}
        />
      ) : (
        <p className="card p-6 text-slate-600">
          아직 대진표가 없습니다. 대진표 관리 화면에서 먼저 만들어 주세요.
        </p>
      )}
    </div>
  );
}
