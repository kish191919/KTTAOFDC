import type { Metadata } from "next";
import type { Album } from "@/lib/types";
import { yearOf } from "@/lib/dates";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeAlbum } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { listAlbums } from "@/lib/store/albums";
import { AlbumCard } from "@/components/AlbumCard";
import { PageHeader } from "@/components/PageHeader";
import { ImageIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string }> };

// 저장하면 바로 새로 만들어지지만, 이 사이트 밖(내 컴퓨터·스크립트)에서 고친 내용도
// 반영되도록 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const t = getDictionary(lang).gallery;
  return pageMetadata({ lang, path: "/gallery", title: t.title, description: t.metaDescription });
}

export default async function GalleryPage({ params }: Props) {
  const lang = await readLang(params);
  const t = getDictionary(lang).gallery;
  const albums = (await listAlbums()).map((album) => localizeAlbum(album, lang));

  const byYear = new Map<number, Album[]>();
  for (const album of albums) {
    const year = yearOf(album.date);
    byYear.set(year, [...(byYear.get(year) ?? []), album]);
  }

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />

      <div className="mx-auto max-w-6xl px-4 py-14">
        {albums.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
              <ImageIcon className="size-7" />
            </span>
            <p className="mt-5 text-lg font-bold text-brand-950">{t.emptyTitle}</p>
            <p className="mt-2 break-keep text-slate-500">{t.emptyDescription}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {[...byYear.entries()].map(([year, items]) => (
              <section key={year} aria-labelledby={`year-${year}`}>
                <h2
                  id={`year-${year}`}
                  className="mb-5 flex items-center gap-3 text-lg font-bold text-brand-700"
                >
                  {t.year(year)}
                  <span className="h-px flex-1 bg-brand-100" />
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((album) => (
                    <AlbumCard key={album.id} album={album} lang={lang} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
