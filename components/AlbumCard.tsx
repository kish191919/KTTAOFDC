import Link from "next/link";
import type { Album } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { ArrowRightIcon, ImageIcon } from "@/components/icons";

export function AlbumCard({ album }: { album: Album }) {
  const cover = album.photos[0];
  return (
    <Link
      href={`/gallery/${album.id}`}
      className="group card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
    >
      <div className="relative aspect-video overflow-hidden bg-linear-to-br from-brand-100 to-brand-200">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-400">
            <ImageIcon className="size-10" />
          </div>
        )}
        <span className="absolute right-3 bottom-3 rounded-full bg-navy-950/75 px-2.5 py-1 text-xs font-semibold text-white">
          사진 {album.photos.length}장
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold text-accent-600">{formatDate(album.date)}</p>
        <h3 className="mt-1 line-clamp-2 text-lg leading-snug font-bold break-keep text-slate-900 transition-colors group-hover:text-brand-700">
          {album.title}
        </h3>
        <div className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-brand-700">
          사진 보기
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
