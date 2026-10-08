import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { albumCover } from "@/lib/albums";
import { formatDate } from "@/lib/dates";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeAlbum } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { getAlbum, listAlbums } from "@/lib/store/albums";
import { AlbumPhotos } from "@/components/AlbumPhotos";
import { AlbumVideos } from "@/components/AlbumVideos";
import { LinkedText } from "@/components/LinkedText";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string; id: string }> };

// 저장하면 바로 새로 만들어지지만, 이 사이트 밖(내 컴퓨터·스크립트)에서 고친 내용도
// 반영되도록 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listAlbums()).map((album) => ({ id: album.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const { id } = await params;
  const t = getDictionary(lang).gallery;
  const stored = await getAlbum(id);
  if (!stored) return { title: t.title };

  const album = localizeAlbum(stored, lang);
  const description =
    album.description ||
    `${formatDate(album.date, true, lang)} · ${t.mediaCount(album.photos.length, album.videos?.length ?? 0)}`;
  return pageMetadata({
    lang,
    path: `/gallery/${album.id}`,
    title: album.title,
    description,
    image: albumCover(album),
  });
}

export default async function AlbumPage({ params }: Props) {
  const lang = await readLang(params);
  const { id } = await params;
  const stored = await getAlbum(id);
  if (!stored) notFound();

  const t = getDictionary(lang).gallery;
  const album = localizeAlbum(stored, lang);
  const videos = album.videos ?? [];

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <Link
        href={localePath(lang, "/gallery")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        {t.back}
      </Link>

      <header className="mt-5 border-b border-brand-100 pb-8">
        <p className="text-sm font-semibold text-accent-600">
          {formatDate(album.date, true, lang)} · {t.mediaCount(album.photos.length, videos.length)}
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

      <div className="mt-10 space-y-12">
        {album.photos.length > 0 && (
          <AlbumPhotos photos={album.photos} title={album.title} lang={lang} />
        )}
        {videos.length > 0 && (
          <section aria-labelledby="album-videos">
            <h2
              id="album-videos"
              className="mb-5 flex items-center gap-3 text-lg font-bold text-brand-700"
            >
              {t.videosTitle}
              <span className="h-px flex-1 bg-brand-100" />
            </h2>
            <AlbumVideos videos={videos} title={album.title} lang={lang} />
          </section>
        )}
        {album.photos.length === 0 && videos.length === 0 && (
          <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 text-center text-slate-500">
            {t.noPhotos}
          </p>
        )}
      </div>

      <div className="mt-14 border-t border-brand-100 pt-8 text-center">
        <Link href={localePath(lang, "/gallery")} className="btn btn-outline">
          <ArrowLeftIcon className="size-4" />
          {t.more}
        </Link>
      </div>
    </article>
  );
}
