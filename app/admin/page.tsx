import Link from "next/link";
import {
  deleteAlbumAction,
  deleteNewsPostAction,
  deleteTournamentAction,
  logoutAction,
  setAlbumHiddenAction,
  setNewsPostHiddenAction,
  setTournamentHiddenAction,
} from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatDateRange, statusLabel, statusOf, today } from "@/lib/dates";
import { listAlbums } from "@/lib/store/albums";
import { listHeroMedia } from "@/lib/store/hero";
import { STORE_WRITABLE } from "@/lib/store/json-file";
import { listNewsPosts } from "@/lib/store/news";
import { listTournaments } from "@/lib/store/tournaments";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { HiddenToggle } from "@/components/admin/HiddenControls";
import {
  CheckIcon,
  ExternalLinkIcon,
  FilmIcon,
  InfoIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/icons";

type Props = {
  searchParams: Promise<{ saved?: string; deleted?: string; id?: string }>;
};

const editLinkClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700";

const hiddenBadge = (
  <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700 ring-1 ring-accent-200">
    숨김
  </span>
);

export default async function AdminPage({ searchParams }: Props) {
  await requireAdmin();
  const [{ saved, deleted, id }, tournaments, albums, news, heroMedia] = await Promise.all([
    searchParams,
    listTournaments({ includeHidden: true }),
    listAlbums({ includeHidden: true }),
    listNewsPosts({ includeHidden: true }),
    listHeroMedia(),
  ]);
  const now = today();
  const heroShown = heroMedia.filter((item) => item.active).length;

  const savedItem =
    saved === "tournament"
      ? tournaments.find((t) => t.id === id)
      : saved === "album"
        ? albums.find((album) => album.id === id)
        : saved === "news"
          ? news.find((post) => post.id === id)
          : undefined;
  const savedPath =
    saved === "tournament" ? "/tournaments" : saved === "album" ? "/gallery" : "/community/news";
  // 숨긴 대회·앨범·소식은 방문자용 페이지가 없으므로 링크를 보여 주지 않습니다.
  const savedHref = savedItem && !savedItem.hidden ? `${savedPath}/${savedItem.id}` : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-950">홈페이지 관리</h1>
          <p className="mt-1 text-slate-500">
            메인 화면 동영상, 대회 정보, 갤러리 사진, 탁구 소식을 등록하고 수정합니다.
          </p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-ghost btn-sm">
            <LogOutIcon className="size-4" />
            로그아웃
          </button>
        </form>
      </div>

      {!STORE_WRITABLE && (
        <p className="mt-6 flex gap-2.5 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm leading-relaxed break-keep text-accent-700">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          이 서버는 읽기 전용입니다. 데이터베이스를 연결하기 전까지는 내 컴퓨터에서 내용을
          수정한 뒤 다시 배포해야 반영됩니다.
        </p>
      )}
      {savedItem && (
        <p className="mt-6 flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-200 bg-white p-4 text-sm font-medium text-brand-800">
          <CheckIcon className="size-4 shrink-0" />
          저장했습니다.
          {savedHref ? (
            <Link
              href={savedHref}
              className="inline-flex items-center gap-1 font-bold underline underline-offset-2"
            >
              게시된 페이지 보기
              <ExternalLinkIcon className="size-3.5" />
            </Link>
          ) : (
            <span>숨김 상태라 방문자에게는 아직 보이지 않습니다.</span>
          )}
        </p>
      )}
      {deleted && (
        <p className="mt-6 flex items-center gap-2.5 rounded-xl border border-brand-200 bg-white p-4 text-sm font-medium text-brand-800">
          <CheckIcon className="size-4 shrink-0" />
          삭제했습니다.
        </p>
      )}

      {/* 메인 화면 */}
      <section className="mt-10" aria-labelledby="hero-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="hero-heading" className="text-xl font-black text-brand-950">
            메인 화면 <span className="text-base font-bold text-slate-400">{heroMedia.length}</span>
          </h2>
          <Link href="/admin/hero" className="btn btn-accent btn-sm">
            <FilmIcon className="size-4" />
            동영상·이미지 관리
          </Link>
        </div>
        <p className="card px-5 py-4 text-sm leading-relaxed break-keep text-slate-600">
          {heroShown > 0
            ? `홈 화면 맨 위에 동영상·이미지 ${heroShown}개가 차례로 나오고 있습니다.`
            : "홈 화면 맨 위에 기본 배너 이미지가 나오고 있습니다. 동영상을 올리면 배너 자리에서 자동으로 재생됩니다."}
        </p>
      </section>

      {/* 대회 정보 */}
      <section className="mt-12" aria-labelledby="tournaments-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="tournaments-heading" className="text-xl font-black text-brand-950">
            대회 정보 <span className="text-base font-bold text-slate-400">{tournaments.length}</span>
          </h2>
          <Link href="/admin/tournaments/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 대회 등록
          </Link>
        </div>
        {tournaments.length === 0 ? (
          <p className="card px-6 py-10 text-center text-slate-500">
            등록된 대회가 없습니다. ‘새 대회 등록’을 눌러 첫 대회를 올려 보세요.
          </p>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {tournaments.map((tournament) => {
              const past = statusOf(tournament, now) === "past";
              return (
                <li
                  key={tournament.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
                >
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          past ? "bg-slate-100 text-slate-500" : "bg-brand-700 text-white"
                        }`}
                      >
                        {statusLabel(tournament, now)}
                      </span>
                      {tournament.hidden && hiddenBadge}
                      {formatDateRange(tournament, true)}
                    </p>
                    {/* 숨긴 대회는 방문자용 페이지가 없으므로 수정 화면으로 보냅니다. */}
                    <Link
                      href={
                        tournament.hidden
                          ? `/admin/tournaments/${tournament.id}`
                          : `/tournaments/${tournament.id}`
                      }
                      className="mt-1 block truncate font-bold text-slate-900 hover:text-brand-700"
                    >
                      {tournament.title}
                    </Link>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/admin/tournaments/${tournament.id}`}
                      className={editLinkClass}
                    >
                      <PencilIcon className="size-4" />
                      수정
                    </Link>
                    <HiddenToggle
                      hidden={Boolean(tournament.hidden)}
                      action={setTournamentHiddenAction.bind(null, tournament.id)}
                      disabled={!STORE_WRITABLE}
                    />
                    <DeleteButton
                      action={deleteTournamentAction.bind(null, tournament.id)}
                      confirmMessage={`'${tournament.title}' 대회를 삭제할까요?\n포스터와 첨부 파일도 함께 지워지며 되돌릴 수 없습니다.`}
                      disabled={!STORE_WRITABLE}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 갤러리 */}
      <section className="mt-12" aria-labelledby="albums-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="albums-heading" className="text-xl font-black text-brand-950">
            갤러리 앨범 <span className="text-base font-bold text-slate-400">{albums.length}</span>
          </h2>
          <Link href="/admin/albums/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 앨범 만들기
          </Link>
        </div>
        {albums.length === 0 ? (
          <p className="card px-6 py-10 text-center text-slate-500">
            등록된 앨범이 없습니다. ‘새 앨범 만들기’를 눌러 행사 사진을 올려 보세요.
          </p>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {albums.map((album) => (
              <li
                key={album.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1 basis-64">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    {album.hidden && hiddenBadge}
                    {formatDate(album.date)} · 사진 {album.photos.length}장
                  </p>
                  {/* 숨긴 앨범은 방문자용 페이지가 없으므로 수정 화면으로 보냅니다. */}
                  <Link
                    href={album.hidden ? `/admin/albums/${album.id}` : `/gallery/${album.id}`}
                    className="mt-1 block truncate font-bold text-slate-900 hover:text-brand-700"
                  >
                    {album.title}
                  </Link>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/admin/albums/${album.id}`} className={editLinkClass}>
                    <PencilIcon className="size-4" />
                    수정
                  </Link>
                  <HiddenToggle
                    hidden={Boolean(album.hidden)}
                    action={setAlbumHiddenAction.bind(null, album.id)}
                    disabled={!STORE_WRITABLE}
                  />
                  <DeleteButton
                    action={deleteAlbumAction.bind(null, album.id)}
                    confirmMessage={`'${album.title}' 앨범을 삭제할까요?\n사진 ${album.photos.length}장도 함께 지워지며 되돌릴 수 없습니다.`}
                    disabled={!STORE_WRITABLE}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 탁구 소식 */}
      <section className="mt-12" aria-labelledby="news-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="news-heading" className="text-xl font-black text-brand-950">
            탁구 소식 <span className="text-base font-bold text-slate-400">{news.length}</span>
          </h2>
          <Link href="/admin/news/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 소식 등록
          </Link>
        </div>
        {news.length === 0 ? (
          <p className="card px-6 py-10 text-center text-slate-500">
            등록된 소식이 없습니다. ‘새 소식 등록’을 눌러 신문 기사나 회원 안내를 올려 보세요.
          </p>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {news.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    {post.hidden && hiddenBadge}
                    {formatDate(post.date)}
                    {post.source && ` · ${post.source}`}
                  </p>
                  {/* 숨긴 소식은 방문자용 페이지가 없으므로 수정 화면으로 보냅니다. */}
                  <Link
                    href={post.hidden ? `/admin/news/${post.id}` : `/community/news/${post.id}`}
                    className="mt-1 block truncate font-bold text-slate-900 hover:text-brand-700"
                  >
                    {post.title}
                  </Link>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link href={`/admin/news/${post.id}`} className={editLinkClass}>
                    <PencilIcon className="size-4" />
                    수정
                  </Link>
                  <HiddenToggle
                    hidden={Boolean(post.hidden)}
                    action={setNewsPostHiddenAction.bind(null, post.id)}
                    disabled={!STORE_WRITABLE}
                  />
                  <DeleteButton
                    action={deleteNewsPostAction.bind(null, post.id)}
                    confirmMessage={`'${post.title}' 소식을 삭제할까요?\n이미지와 첨부 파일도 함께 지워지며 되돌릴 수 없습니다.`}
                    disabled={!STORE_WRITABLE}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
