"use client";

import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { VideoRef } from "@/lib/types";
import { Lightbox, useLightbox, type ViewerItem } from "@/components/ImageViewer";
import { DownloadIcon, PlayIcon } from "@/components/icons";
import { downloadUrl } from "@/components/download";

type Props = {
  videos: VideoRef[];
  /** 앨범 이름. 동영상 설명과 내려받는 파일 이름에 쓰입니다. */
  title: string;
  lang: Locale;
};

/**
 * 앨범의 동영상 격자. 대표 화면을 누르면 크게 띄워서 재생하고,
 * '내려받기'를 누르면 그 동영상 파일을 바로 저장합니다.
 * (동영상은 커서 사진처럼 여러 개를 ZIP 으로 묶지 않고 하나씩 받습니다)
 */
export function AlbumVideos({ videos, title, lang }: Props) {
  const t = getDictionary(lang).gallery;
  const viewer = useLightbox(videos.length);
  const items = useMemo<ViewerItem[]>(
    () =>
      videos.map((video, index) => ({
        ...video,
        type: "video",
        // 파일 이름에는 앨범에서의 순서를 붙입니다. (예: "가을 친선 탁구대회 동영상 02.mp4")
        download: downloadUrl({ src: video.src, name: t.videoFileName(title, index + 1) }),
      })),
    [videos, title, t],
  );

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((video, index) => (
          <li key={video.src} className="relative">
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
            <a
              href={items[index].download}
              aria-label={t.videoDownload(title, index + 1)}
              className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-white/90 py-1.5 pr-3 pl-2.5 text-xs font-bold text-brand-700 shadow-md transition-colors hover:bg-white"
            >
              <DownloadIcon className="size-4" />
              {t.videoDownloadButton}
            </a>
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
