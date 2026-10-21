import Link from "next/link";
import { deleteTournamentAction, setTournamentHiddenAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDateRange, statusLabel, statusOf, today, yearOf } from "@/lib/dates";
import { drawStage, drawStageLabel } from "@/lib/draw/summary";
import { listDraws } from "@/lib/store/draws";
import { listTournaments } from "@/lib/store/tournaments";
import { AdminHeader, AdminNotice } from "@/components/admin/AdminHeader";
import { AdminList, type AdminListItem } from "@/components/admin/AdminList";
import { PlusIcon } from "@/components/icons";

type Props = {
  /** saved 는 방금 저장한 대회의 id 입니다. */
  searchParams: Promise<{ saved?: string; deleted?: string }>;
};

const filters = [
  { key: "upcoming", label: "예정" },
  { key: "past", label: "지난 대회" },
  { key: "hidden", label: "숨김" },
];

export default async function AdminTournamentsPage({ searchParams }: Props) {
  await requireAdmin();
  const [{ saved, deleted }, tournaments, draws] = await Promise.all([
    searchParams,
    listTournaments({ includeHidden: true }),
    listDraws(),
  ]);
  const now = today();
  const savedItem = saved ? tournaments.find((tournament) => tournament.id === saved) : undefined;
  const drawOf = new Map(draws.map((draw) => [draw.id, draw]));

  const items: AdminListItem[] = tournaments.map((tournament) => {
    const past = statusOf(tournament, now) === "past";
    const draw = drawOf.get(tournament.id);
    return {
      id: tournament.id,
      title: tournament.title,
      meta: formatDateRange(tournament),
      status: { label: statusLabel(tournament, now), muted: past },
      hidden: Boolean(tournament.hidden),
      year: yearOf(tournament.startDate),
      keywords: [tournament.en?.title, tournament.venue, tournament.organizer]
        .filter(Boolean)
        .join(" "),
      filters: [past ? "past" : "upcoming", ...(tournament.hidden ? ["hidden"] : [])],
      viewHref: `/tournaments/${tournament.id}`,
      editHref: `/admin/tournaments/${tournament.id}`,
      // 대진표 버튼은 앞으로 열 대회와 대진표를 만든 대회에만 둡니다.
      draw:
        !past || draw
          ? {
              href: `/admin/tournaments/${tournament.id}/draw`,
              stage: draw && drawStageLabel[drawStage(draw)],
            }
          : undefined,
      deleteMessage: `'${tournament.title}' 대회를 삭제할까요?\n포스터와 첨부 파일도 함께 지워지며 되돌릴 수 없습니다.`,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin/tournaments" />
      <AdminNotice
        savedHref={savedItem && (savedItem.hidden ? null : `/tournaments/${savedItem.id}`)}
        deleted={Boolean(deleted)}
      />

      <section className="mt-8" aria-labelledby="list-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="list-heading" className="text-xl font-black text-brand-950">
            대회 정보 <span className="text-base font-bold text-slate-400">{tournaments.length}</span>
          </h2>
          <Link href="/admin/tournaments/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 대회 등록
          </Link>
        </div>
        <AdminList
          items={items}
          filters={filters}
          searchPlaceholder="대회 이름·장소로 찾기"
          emptyMessage="등록된 대회가 없습니다. ‘새 대회 등록’을 눌러 첫 대회를 올려 보세요."
          setHiddenAction={setTournamentHiddenAction}
          deleteAction={deleteTournamentAction}
        />
      </section>
    </div>
  );
}
