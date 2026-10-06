import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { getAlbum, listAlbums } from "@/lib/store/albums";
import { AlbumPhotos } from "@/components/AlbumPhotos";
import { LinkedText } from "@/components/LinkedText";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await listAlbums()).map((album) => ({ id: album.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) return { title: "갤러리" };

  const description =
    album.description || `${formatDate(album.date)} · 사진 ${album.photos.length}장`;
  return pageMetadata({ title: album.title, description, image: album.photos[0] });
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <Link
        href="/gallery"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        갤러리
      </Link>

      <header className="mt-5 border-b border-brand-100 pb-8">
        <p className="text-sm font-semibold text-accent-600">
          {formatDate(album.date)} · 사진 {album.photos.length}장
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-black break-keep text-brand-950 md:text-4xl">
          {album.title}
        </h1>
        {album.description && (
          <LinkedText
            text={album.description}
            className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600"
          />
        )}
      </header>

      <div className="mt-10">
        {album.photos.length > 0 ? (
          <AlbumPhotos photos={album.photos} title={album.title} />
        ) : (
          <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 text-center text-slate-500">
            아직 등록된 사진이 없습니다.
          </p>
        )}
      </div>

      <div className="mt-14 border-t border-brand-100 pt-8 text-center">
        <Link href="/gallery" className="btn btn-outline">
          <ArrowLeftIcon className="size-4" />
          다른 앨범 보기
        </Link>
      </div>
    </article>
  );
}
