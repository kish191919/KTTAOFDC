"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HeroMedia } from "@/lib/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  VolumeIcon,
  VolumeOffIcon,
} from "@/components/icons";

/** 이미지 한 장을 보여 주는 시간(ms). 동영상은 끝까지 재생한 뒤 다음으로 넘어갑니다. */
const IMAGE_DURATION_MS = 5000;

const controlClass =
  "absolute z-10 rounded-full bg-black/40 text-white transition-colors hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** 홈 화면 맨 위에서 동영상·이미지를 차례로 보여 줍니다. */
export function HeroSlideshow({ items }: { items: HeroMedia[] }) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const count = items.length;
  // 관리자 화면에서 항목을 지워 개수가 줄어도 범위를 벗어나지 않게 합니다.
  const current = index < count ? index : 0;
  const currentType = items[current]?.type;

  const goNext = useCallback(() => setIndex((value) => (value + 1) % count), [count]);
  const goPrev = useCallback(
    () => setIndex((value) => (value - 1 + count) % count),
    [count],
  );

  // 소리 설정을 모든 동영상에 맞춥니다. (아래의 재생보다 먼저 실행되어야 합니다)
  useEffect(() => {
    for (const video of videoRefs.current) {
      if (video) video.muted = muted;
    }
  }, [muted]);

  // 지금 보이는 동영상만 처음부터 재생하고 나머지는 멈춥니다.
  useEffect(() => {
    videoRefs.current.forEach((video, position) => {
      if (!video) return;
      if (position !== current) {
        video.pause();
        return;
      }
      video.currentTime = 0;
      video.play().catch(() => {
        // 브라우저는 소리가 켜진 자동 재생을 막기도 합니다. 그때는 소리를 끄고 다시 재생합니다.
        if (video.muted) return;
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    });
  }, [current, items]);

  useEffect(() => {
    if (currentType !== "image" || count < 2) return;
    const timer = setTimeout(goNext, IMAGE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [current, currentType, count, goNext]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="메인 화면"
      className="relative aspect-video max-h-[calc(100dvh-72px)] w-full overflow-hidden bg-linear-to-br from-brand-900 via-navy-900 to-navy-950"
    >
      {items.map((item, position) => {
        const active = position === current;
        return (
          <div
            key={item.id}
            aria-hidden={!active}
            className={`absolute inset-0 transition-opacity duration-700 ${
              active ? "z-[1] opacity-100" : "opacity-0"
            }`}
          >
            {item.type === "image" ? (
              <>
                {/* 화면 비율이 달라 남는 자리는 같은 이미지를 흐리게 키워서 채웁니다. */}
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={90}
                  className="scale-110 object-cover opacity-70 blur-2xl"
                />
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  sizes="100vw"
                  quality={90}
                  preload={position === 0}
                  className="object-contain"
                />
              </>
            ) : (
              <video
                ref={(element) => {
                  videoRefs.current[position] = element;
                }}
                src={item.src}
                muted={muted}
                playsInline
                // 한 개뿐이면 계속 되풀이하고, 여러 개면 끝난 뒤 다음으로 넘어갑니다.
                loop={count === 1}
                onEnded={goNext}
                // 아직 차례가 아닌 동영상은 미리 내려받지 않습니다.
                preload={active ? "auto" : "none"}
                aria-label={item.title || undefined}
                className="absolute inset-0 size-full object-contain"
              />
            )}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="이전 슬라이드"
            className={`${controlClass} top-1/2 left-3 -translate-y-1/2 p-2 sm:left-4 sm:p-3`}
          >
            <ChevronLeftIcon className="size-5 sm:size-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="다음 슬라이드"
            className={`${controlClass} top-1/2 right-3 -translate-y-1/2 p-2 sm:right-4 sm:p-3`}
          >
            <ChevronRightIcon className="size-5 sm:size-6" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-6">
            {items.map((item, position) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`슬라이드 ${position + 1}`}
                aria-current={position === current ? "true" : undefined}
                className={`size-2.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  position === current ? "scale-125 bg-white" : "bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {currentType === "video" && (
        <button
          type="button"
          onClick={() => setMuted((value) => !value)}
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
          className={`${controlClass} right-3 bottom-3 p-2.5 sm:right-6 sm:bottom-6`}
        >
          {muted ? <VolumeOffIcon className="size-[18px]" /> : <VolumeIcon className="size-[18px]" />}
        </button>
      )}
    </section>
  );
}
