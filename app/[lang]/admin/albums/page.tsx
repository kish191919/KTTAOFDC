import Link from "next/link";
import { deleteAlbumAction, setAlbumHiddenAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate, yearOf } from "@/lib/dates";
import { listAlbums } from "@/lib/store/albums";
import { AdminHeader, AdminNotice } from "@/components/admin/AdminHeader";
import { AdminList, type AdminListItem } from "@/components/admin/AdminList";
import { PlusIcon } from "@/components/icons";

type Props = {
  /** saved 는 방금 저장한 앨범의 id 입니다. */
  searchParams: Promise<{ saved?: string; deleted?: string }>;
};

const filters = [
  { key: "public", label: "공개" },
  { key: "hidden", label: "숨김" },
];

export default async function AdminAlbumsPage({ searchParams }: Props) {
  await requireAdmin();
  const [{ saved, deleted }, albums] = await Promise.all([
    searchParams,
    listAlbums({ includeHidden: true }),
  ]);
  const savedItem = saved ? albums.find((album) => album.id === saved) : undefined;

  const items: AdminListItem[] = albums.map((album) => {
    const videos = album.videos?.length ?? 0;
    return {
      id: album.id,
      title: album.title,
      meta: `${formatDate(album.date, false)} · 사진 ${album.photos.length}장${
        videos ? ` · 동영상 ${videos}개` : ""
      }`,
      hidden: Boolean(album.hidden),
      year: yearOf(album.date),
      keywords: album.en?.title,
      filters: [album.hidden ? "hidden" : "public"],
      viewHref: `/gallery/${album.id}`,
      editHref: `/admin/albums/${album.id}`,
      deleteMessage: `'${album.title}' 앨범을 삭제할까요?\n사진 ${album.photos.length}장${
        videos ? `과 동영상 ${videos}개` : ""
      }도 함께 지워지며 되돌릴 수 없습니다.`,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin/albums" />
      <AdminNotice
        savedHref={savedItem && (savedItem.hidden ? null : `/gallery/${savedItem.id}`)}
        deleted={Boolean(deleted)}
      />

      <section className="mt-8" aria-labelledby="list-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="list-heading" className="text-xl font-black text-brand-950">
            갤러리 앨범 <span className="text-base font-bold text-slate-400">{albums.length}</span>
          </h2>
          <Link href="/admin/albums/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 앨범 만들기
          </Link>
        </div>
        <AdminList
          items={items}
          filters={filters}
          searchPlaceholder="앨범 이름으로 찾기"
          emptyMessage="등록된 앨범이 없습니다. ‘새 앨범 만들기’를 눌러 행사 사진을 올려 보세요."
          setHiddenAction={setAlbumHiddenAction}
          deleteAction={deleteAlbumAction}
        />
      </section>
    </div>
  );
}
