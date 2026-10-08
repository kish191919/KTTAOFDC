import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { statusLabel, statusOf, today } from "@/lib/dates";
import { listAlbums } from "@/lib/store/albums";
import { listHeroMedia } from "@/lib/store/hero";
import { listNewsPosts } from "@/lib/store/news";
import { listTournaments } from "@/lib/store/tournaments";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  CalendarIcon,
  FilmIcon,
  ImageIcon,
  NewspaperIcon,
  PlusIcon,
} from "@/components/icons";

type CardProps = {
  icon: ReactNode;
  title: string;
  count: number;
  /** 굵게 보여 주는 한 줄 요약 */
  summary: string;
  /** 그 아래 작게 보여 주는 글 (다음 대회, 최근 글 등) */
  detail: string;
  /** 카드 아래쪽의 버튼들 */
  children: ReactNode;
};

/** 관리 홈에서 구역 하나를 요약해 보여 주는 카드 */
function SectionCard({ icon, title, count, summary, detail, children }: CardProps) {
  return (
    // min-w-0 이 없으면 한 줄로 자르는 글(truncate) 때문에 좁은 화면에서 카드가 화면 밖으로 넘칩니다.
    <section className="card flex min-w-0 flex-col p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          {icon}
        </span>
        <h2 className="text-xl font-black text-brand-950">
          {title} <span className="text-base font-bold text-slate-400">{count}</span>
        </h2>
      </div>
      <p className="mt-4 text-sm font-semibold break-keep text-slate-700">{summary}</p>
      <p className="mt-1 truncate text-sm text-slate-500">{detail}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">{children}</div>
    </section>
  );
}

/** "공개 12개 · 숨김 1개" 처럼 숨긴 것이 있을 때만 숨김 수를 덧붙입니다. */
function withHidden(summary: string, hidden: number, unit: string): string {
  return hidden > 0 ? `${summary} · 숨김 ${hidden}${unit}` : summary;
}

export default async function AdminPage() {
  await requireAdmin();
  const [tournaments, albums, news, heroMedia] = await Promise.all([
    listTournaments({ includeHidden: true }),
    listAlbums({ includeHidden: true }),
    listNewsPosts({ includeHidden: true }),
    listHeroMedia(),
  ]);
  const now = today();
  const heroShown = heroMedia.filter((item) => item.active).length;

  const upcoming = tournaments.filter((tournament) => statusOf(tournament, now) !== "past");
  // 목록이 최신순이므로 예정된 대회 가운데 맨 뒤가 가장 가까운 대회입니다.
  const next = upcoming.at(-1);
  const hiddenCount = (items: { hidden?: boolean }[]) => items.filter((item) => item.hidden).length;
  const hiddenAlbums = hiddenCount(albums);
  const hiddenNews = hiddenCount(news);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin" />

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <SectionCard
          icon={<FilmIcon className="size-5" />}
          title="메인 화면"
          count={heroMedia.length}
          summary={
            heroShown > 0
              ? `홈 화면 맨 위에 동영상·이미지 ${heroShown}개가 차례로 나오고 있습니다.`
              : "홈 화면 맨 위에 기본 배너 이미지가 나오고 있습니다."
          }
          detail={
            heroShown > 0
              ? "순서를 바꾸거나 잠시 숨길 수 있습니다."
              : "동영상을 올리면 배너 자리에서 자동으로 재생됩니다."
          }
        >
          <Link href="/admin/hero" className="btn btn-accent btn-sm">
            <FilmIcon className="size-4" />
            동영상·이미지 관리
          </Link>
        </SectionCard>

        <SectionCard
          icon={<CalendarIcon className="size-5" />}
          title="대회 정보"
          count={tournaments.length}
          summary={withHidden(
            `예정 ${upcoming.length}건 · 지난 대회 ${tournaments.length - upcoming.length}건`,
            hiddenCount(tournaments),
            "건",
          )}
          detail={
            next
              ? `다음 대회: ${next.title} (${statusLabel(next, now)})`
              : "예정된 대회가 없습니다."
          }
        >
          <Link href="/admin/tournaments" className="btn btn-ghost btn-sm">
            목록 보기
          </Link>
          <Link href="/admin/tournaments/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 대회 등록
          </Link>
        </SectionCard>

        <SectionCard
          icon={<ImageIcon className="size-5" />}
          title="갤러리 앨범"
          count={albums.length}
          summary={withHidden(`공개 ${albums.length - hiddenAlbums}개`, hiddenAlbums, "개")}
          detail={albums[0] ? `최근 앨범: ${albums[0].title}` : "등록된 앨범이 없습니다."}
        >
          <Link href="/admin/albums" className="btn btn-ghost btn-sm">
            목록 보기
          </Link>
          <Link href="/admin/albums/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 앨범 만들기
          </Link>
        </SectionCard>

        <SectionCard
          icon={<NewspaperIcon className="size-5" />}
          title="탁구 소식"
          count={news.length}
          summary={withHidden(`공개 ${news.length - hiddenNews}건`, hiddenNews, "건")}
          detail={news[0] ? `최근 소식: ${news[0].title}` : "등록된 소식이 없습니다."}
        >
          <Link href="/admin/news" className="btn btn-ghost btn-sm">
            목록 보기
          </Link>
          <Link href="/admin/news/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 소식 등록
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}
