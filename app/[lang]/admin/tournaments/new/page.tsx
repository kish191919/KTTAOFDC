import Link from "next/link";
import { saveTournamentAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { ArrowLeftIcon } from "@/components/icons";

export default async function NewTournamentPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin/tournaments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        대회 정보 목록
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-black text-brand-950">새 대회 등록</h1>
      <TournamentForm action={saveTournamentAction.bind(null, null)} />
    </div>
  );
}
