"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { VideoRef } from "@/lib/types";
import { Lightbox, useLightbox, type ViewerItem } from "@/components/ImageViewer";
import { PlayIcon } from "@/components/icons";

type Props = {
  videos: VideoRef[];
  /** 앨범 이름. 동영상 설명에 쓰입니다. */
  title: string;
  lang: Locale;
};

/** 앨범의 동영상 격자. 대표 화면을 누르면 크게 띄워서 재생합니다. */
export function AlbumVideos({ videos, title, lang }: Props) {
  const t = getDictionary(lang).gallery;
  const viewer = useLightbox(videos.length);
  const items = useMemo<ViewerItem[]>(
    () => videos.map((video) => ({ ...video, type: "video" })),
    [videos],
  );

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video, index) => (
          <li key={video.src}>
            <button
              type="button"
              onClick={() => viewer.open(index)}
              aria-label={t.videoPlay(title, index + 1)}
              className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl bg-navy-950"
            >
              {video.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.poster}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center bg-navy-950/15 transition-colors group-hover:bg-navy-950/30"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-brand-700 shadow-lg">
                  <PlayIcon className="size-6" />
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {viewer.current !== null && (
        <Lightbox
          images={items}
          label={title}
          lang={lang}
          current={viewer.current}
          onStep={viewer.step}
          onClose={viewer.close}
        />
      )}
    </>
  );
}
