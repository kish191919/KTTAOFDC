"use client";

import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { ImageRef } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";

/** 크게 보고 있는 이미지의 순서(닫혀 있으면 null)와 열기·닫기·넘기기 함수 */
export function useLightbox(count: number) {
  const [current, setCurrent] = useState<number | null>(null);
  const close = useCallback(() => setCurrent(null), []);
  const step = useCallback(
    (delta: number) =>
      setCurrent((index) => (index === null ? index : (index + delta + count) % count)),
    [count],
  );
  return { current, open: setCurrent, close, step };
}

type LightboxProps = {
  images: ImageRef[];
  /** 사진마다 붙일 설명의 앞부분 (예: 대회 이름) */
  label: string;
  /** 버튼 이름과 이미지 설명에 쓸 언어 */
  lang: Locale;
  /** 지금 보여 줄 이미지의 순서 */
  current: number;
  onStep: (delta: number) => void;
  onClose: () => void;
};

/** 이미지 한 장을 화면 가득 보여 주는 창. Esc 로 닫고 ← → 로 넘깁니다. */
export function Lightbox({ images, label, lang, current, onStep, onClose }: LightboxProps) {
  const t = getDictionary(lang).viewer;
  const count = images.length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onStep(-1);
      if (event.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    // 크게 보는 동안에는 뒤의 페이지가 스크롤되지 않게 합니다.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, onStep]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.dialog(label)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/95"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[current].src}
        alt={t.alt(label, current + 1)}
        className="max-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1.5rem)] cursor-default rounded-lg object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        autoFocus
        className="absolute top-3 right-3 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25"
      >
        <CloseIcon className="size-6" />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStep(-1);
            }}
            aria-label={t.previous}
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 sm:left-4"
          >
            <ChevronLeftIcon className="size-7" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStep(1);
            }}
            aria-label={t.next}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 sm:right-4"
          >
            <ChevronRightIcon className="size-7" />
          </button>
          <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {current + 1} / {count}
          </p>
        </>
      )}
    </div>
  );
}

type Props = {
  images: ImageRef[];
  /** 사진마다 붙일 설명의 앞부분 (예: 대회 이름) */
  label: string;
  lang: Locale;
};

/** 포스터처럼 원본 비율로 세로로 나열하고, 누르면 화면 가득 크게 보여 줍니다. */
export function ImageViewer({ images, label, lang }: Props) {
  const t = getDictionary(lang).viewer;
  const viewer = useLightbox(images.length);

  return (
    <>
      <div className="space-y-5">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => viewer.open(index)}
            aria-label={t.enlarge(label, index + 1)}
            className="block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={t.alt(label, index + 1)}
              width={image.width}
              height={image.height}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              className="mx-auto h-auto w-full"
            />
          </button>
        ))}
      </div>

      {viewer.current !== null && (
        <Lightbox
          images={images}
          label={label}
          lang={lang}
          current={viewer.current}
          onStep={viewer.step}
          onClose={viewer.close}
        />
      )}
    </>
  );
}
