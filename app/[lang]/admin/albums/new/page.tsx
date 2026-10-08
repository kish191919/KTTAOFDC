import Link from "next/link";
import { saveAlbumAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { AlbumForm } from "@/components/admin/AlbumForm";
import { ArrowLeftIcon } from "@/components/icons";

export default async function NewAlbumPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin/albums"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        갤러리 앨범 목록
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-black text-brand-950">새 앨범 만들기</h1>
      <AlbumForm action={saveAlbumAction.bind(null, null)} />
    </div>
  );
}
