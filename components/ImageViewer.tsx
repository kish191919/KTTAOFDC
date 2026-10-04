"use client";

import { useCallback, useEffect, useState } from "react";
import type { ImageRef } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";

type Props = {
  images: ImageRef[];
  /** 사진마다 붙일 설명의 앞부분 (예: 대회 이름) */
  label: string;
  /** stack: 포스터처럼 원본 비율로 세로로 나열 / grid: 사진첩처럼 정사각 썸네일 격자 */
  layout: "stack" | "grid";
};

/** 이미지를 누르면 화면 가득 크게 볼 수 있는 뷰어 */
export function ImageViewer({ images, label, layout }: Props) {
  const [current, setCurrent] = useState<number | null>(null);
  const count = images.length;

  const close = useCallback(() => setCurrent(null), []);
  const step = useCallback(
    (delta: number) =>
      setCurrent((index) => (index === null ? index : (index + delta + count) % count)),
    [count],
  );

  const isOpen = current !== null;
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    // 크게 보는 동안에는 뒤의 페이지가 스크롤되지 않게 합니다.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, close, step]);

  return (
    <>
      {layout === "stack" ? (
        <div className="space-y-5">
          {images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`${label} 이미지 ${index + 1} 크게 보기`}
              className="block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={`${label} 이미지 ${index + 1}`}
                width={image.width}
                height={image.height}
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
                className="mx-auto h-auto w-full"
              />
            </button>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setCurrent(index)}
                aria-label={`${label} 사진 ${index + 1} 크게 보기`}
                className="group block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={`${label} 사진 ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {current !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${label} 이미지 크게 보기`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/95"
          onClick={close}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[current].src}
            alt={`${label} 이미지 ${current + 1}`}
            className="max-h-[calc(100dvh-5rem)] max-w-[calc(100vw-1.5rem)] cursor-default rounded-lg object-contain shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          />

          <button
            type="button"
            onClick={close}
            aria-label="닫기"
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
                  step(-1);
                }}
                aria-label="이전 이미지"
                className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 sm:left-4"
              >
                <ChevronLeftIcon className="size-7" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  step(1);
                }}
                aria-label="다음 이미지"
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
      )}
    </>
  );
}
