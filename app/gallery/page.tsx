import type { Album } from "@/lib/types";
import { yearOf } from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { listAlbums } from "@/lib/store/albums";
import { AlbumCard } from "@/components/AlbumCard";
import { PageHeader } from "@/components/PageHeader";
import { ImageIcon } from "@/components/icons";

export const metadata = pageMetadata({
  title: "갤러리",
  description: "버지니아 한인 탁구 협회의 대회와 모임 사진을 모았습니다.",
});

export default async function GalleryPage() {
  const albums = await listAlbums();

  const byYear = new Map<number, Album[]>();
  for (const album of albums) {
    const year = yearOf(album.date);
    byYear.set(year, [...(byYear.get(year) ?? []), album]);
  }

  return (
    <>
      <PageHeader
        eyebrow="Gallery"
        title="갤러리"
        description="대회와 모임의 순간들을 사진으로 만나보세요."
      />

      <div className="mx-auto max-w-6xl px-4 py-14">
        {albums.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
              <ImageIcon className="size-7" />
            </span>
            <p className="mt-5 text-lg font-bold text-brand-950">사진을 준비하고 있습니다</p>
            <p className="mt-2 break-keep text-slate-500">
              행사 사진이 올라오면 이곳에서 앨범별로 보실 수 있습니다.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {[...byYear.entries()].map(([year, items]) => (
              <section key={year} aria-labelledby={`year-${year}`}>
                <h2
                  id={`year-${year}`}
                  className="mb-5 flex items-center gap-3 text-lg font-bold text-brand-700"
                >
                  {year}년
                  <span className="h-px flex-1 bg-brand-100" />
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((album) => (
                    <AlbumCard key={album.id} album={album} />
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
