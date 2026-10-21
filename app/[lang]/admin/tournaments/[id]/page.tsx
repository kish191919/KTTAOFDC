import Link from "next/link";
import { notFound } from "next/navigation";
import { saveTournamentAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getTournament } from "@/lib/store/tournaments";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { ArrowLeftIcon, TrophyIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

export default async function EditTournamentPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const tournament = await getTournament(id, { includeHidden: true });
  if (!tournament) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin/tournaments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        대회 정보 목록
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-brand-950">대회 정보 수정</h1>
        <Link href={`/admin/tournaments/${tournament.id}/draw`} className="btn btn-outline btn-sm">
          <TrophyIcon className="size-4" />
          대진표 관리
        </Link>
      </div>
      <TournamentForm
        tournament={tournament}
        action={saveTournamentAction.bind(null, tournament.id)}
      />
    </div>
  );
}
