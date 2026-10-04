import Link from "next/link";
import { notFound } from "next/navigation";
import { saveAlbumAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getAlbum } from "@/lib/store/albums";
import { STORE_WRITABLE } from "@/lib/store/json-file";
import { AlbumForm } from "@/components/admin/AlbumForm";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

export default async function EditAlbumPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        홈페이지 관리
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-black text-brand-950">앨범 수정</h1>
      <AlbumForm
        album={album}
        action={saveAlbumAction.bind(null, album.id)}
        readOnly={!STORE_WRITABLE}
      />
    </div>
  );
}
