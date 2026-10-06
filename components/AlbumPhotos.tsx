"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { ImageRef } from "@/lib/types";
import { Lightbox, useLightbox } from "@/components/ImageViewer";
import { CheckIcon, DownloadIcon } from "@/components/icons";
import { downloadPhotos } from "@/components/download";

type Props = {
  photos: ImageRef[];
  /** 앨범 이름. 사진 설명과 내려받는 파일 이름에 쓰입니다. */
  title: string;
  lang: Locale;
};

/**
 * 앨범의 사진 격자. 사진을 누르면 크게 보여 주고,
 * '사진 내려받기'를 누르면 여러 장을 골라 한꺼번에 받을 수 있습니다.
 */
export function AlbumPhotos({ photos, title, lang }: Props) {
  const t = getDictionary(lang).gallery;
  const viewer = useLightbox(photos.length);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const busy = progress !== null;
  const allSelected = selected.size === photos.length;

  const toggle = (src: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(src)) next.add(src);
      return next;
    });

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function handleDownload() {
    // 파일 이름에는 앨범에서의 순서를 붙입니다. (예: "가을 친선 탁구대회 007.jpg")
    const files = photos.flatMap((photo, index) =>
      selected.has(photo.src)
        ? [{ src: photo.src, name: `${title} ${String(index + 1).padStart(3, "0")}` }]
        : [],
    );
    if (files.length === 0) return;

    setNotice(null);
    setProgress({ done: 0, total: files.length });
    try {
      const failed = await downloadPhotos(files, title, (done) =>
        setProgress({ done, total: files.length }),
      );
      if (failed > 0) {
        setNotice(t.partialFailure(failed));
      } else {
        stopSelecting();
      }
    } catch {
      setNotice(t.downloadFailure);
    } finally {
      setProgress(null);
    }
  }

  return (
    <>
      {selecting ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <p className="text-sm font-semibold break-keep text-brand-900" aria-live="polite">
            {selected.size > 0 ? t.selected(selected.size) : t.downloadHint}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelected(allSelected ? new Set() : new Set(photos.map((photo) => photo.src)))
              }
              disabled={busy}
              className="btn btn-ghost btn-sm"
            >
              {allSelected ? t.deselectAll : t.selectAll}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy || selected.size === 0}
              className="btn btn-brand btn-sm"
            >
              <DownloadIcon className="size-4" />
              {progress ? t.preparing(progress.done, progress.total) : t.downloadStart}
            </button>
            <button
              type="button"
              onClick={stopSelecting}
              disabled={busy}
              className="btn btn-ghost btn-sm"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setSelecting(true);
            }}
            className="btn btn-ghost btn-sm"
          >
            <DownloadIcon className="size-4" />
            {t.download}
          </button>
        </div>
      )}

      {notice && (
        <p
          className="mb-4 rounded-xl bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700"
          role="alert"
        >
          {notice}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, index) => {
          const isSelected = selected.has(photo.src);
          return (
            <li key={photo.src}>
              <button
                type="button"
                onClick={() => (selecting ? toggle(photo.src) : viewer.open(index))}
                disabled={busy}
                aria-label={
                  selecting ? t.photoSelect(title, index + 1) : t.photoEnlarge(title, index + 1)
                }
                aria-pressed={selecting ? isSelected : undefined}
                className={`group relative block aspect-square w-full overflow-hidden rounded-xl bg-slate-100 ${
                  selecting ? "cursor-pointer" : "cursor-zoom-in"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={t.photoAlt(title, index + 1)}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {selecting && (
                  <>
                    {isSelected && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-xl ring-4 ring-brand-600 ring-inset"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={`absolute top-2 left-2 flex size-6 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-white bg-navy-950/40 text-transparent"
                      }`}
                    >
                      <CheckIcon className="size-4" />
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {viewer.current !== null && (
        <Lightbox
          images={photos}
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
