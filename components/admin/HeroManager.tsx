"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import {
  addHeroMediaAction,
  deleteHeroMediaAction,
  moveHeroMediaAction,
  setHeroMediaActiveAction,
  type FormState,
} from "@/lib/actions";
import type { HeroMedia } from "@/lib/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeOffIcon,
  FilmIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";
import { MAX_VIDEO_MB, uploadImage, uploadVideo } from "./upload";

/** 화면 가득 보여 주는 이미지라서 다른 사진(1600px)보다 크게 남겨 둡니다. */
const HERO_IMAGE_MAX_DIMENSION = 2400;

const iconButtonClass =
  "rounded-lg p-2 text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500";

type Props = {
  items: HeroMedia[];
  max: number;
};

export function HeroManager({ items, max }: Props) {
  const titleId = useId();
  const fileId = useId();
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const busy = uploading || pending;
  const full = items.length >= max;
  const shown = items.filter((item) => item.active).length;

  /** 서버 액션을 실행하고, 실패하면 안내 문구를 보여 줍니다. 목록은 서버가 새로 그려 줍니다. */
  function run(action: () => Promise<FormState>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) setError(result.error);
      } catch {
        setError("요청을 처리하지 못했습니다. 잠시 뒤에 다시 시도해 주세요.");
      }
    });
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 고를 수 있도록 입력 칸을 비워 둡니다.
    event.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/") || /\.(mp4|webm)$/i.test(file.name);
      const uploaded = isVideo
        ? await uploadVideo(file)
        : await uploadImage(file, "hero", HERO_IMAGE_MAX_DIMENSION);
      // 제목을 비워 두면 파일 이름을 제목으로 씁니다.
      const fallbackTitle = file.name.normalize("NFC").replace(/\.[^.]+$/, "");
      const result = await addHeroMediaAction({
        title: title.trim() || fallbackTitle,
        ...uploaded,
      });
      if (result.error) setError(result.error);
      else setTitle("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${file.name}: 올리지 못했습니다.`);
    } finally {
      setUploading(false);
    }
  }

  const uploadDisabled = busy || full;

  return (
    <div className="space-y-6">
      {/* 새로 올리기 */}
      <div className="card space-y-5 p-6 md:p-7">
        <div>
          <h2 className="text-lg font-black text-brand-950">새 동영상·이미지 올리기</h2>
          <p className="mt-1 text-sm leading-relaxed break-keep text-slate-500">
            동영상은 MP4·WEBM (최대 {MAX_VIDEO_MB}MB), 이미지는 JPG·PNG·WEBP·GIF 를 올릴 수
            있습니다. 가로로 긴 화면(16:9)에 맞춰 보여 줍니다.
          </p>
        </div>
        <div>
          <label htmlFor={titleId} className="label">
            제목 <span className="font-normal text-slate-400">(선택)</span>
          </label>
          <input
            id={titleId}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={150}
            placeholder="예) 2026 봄 친선 탁구대회 하이라이트"
            disabled={busy}
            className="field"
          />
          <p className="hint">
            홈 화면에는 보이지 않고 이 목록에서 구분하는 데 쓰입니다. 파일을 고르기 전에
            적어 주세요.
          </p>
        </div>
        <div>
          <label
            htmlFor={fileId}
            className={`btn btn-brand btn-sm ${
              uploadDisabled ? "pointer-events-none opacity-60" : "cursor-pointer"
            }`}
          >
            <UploadIcon className="size-4" />
            {uploading
              ? "올리는 중…"
              : full
                ? `최대 ${max}개까지 올릴 수 있습니다`
                : "파일 선택"}
          </label>
          <input
            id={fileId}
            type="file"
            accept="video/mp4,video/webm,image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploadDisabled}
            onChange={handleFile}
          />
        </div>
        {error && (
          <p className="rounded-xl bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* 올려 둔 목록 */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 md:px-6">
          <h2 className="text-lg font-black text-brand-950">
            올려 둔 항목 <span className="text-base font-bold text-slate-400">{items.length}</span>
          </h2>
          <p className="mt-1 text-sm break-keep text-slate-500">
            {shown > 0
              ? "위에서부터 차례로 홈 화면에 나옵니다. 동영상은 끝까지 재생한 뒤 다음으로 넘어갑니다."
              : "홈 화면에 보이는 항목이 없으면 기본 배너 이미지가 나옵니다."}
          </p>
        </div>

        {items.length === 0 ? (
          <p className="px-6 py-12 text-center text-slate-500">
            아직 올린 동영상이나 이미지가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 md:px-6"
              >
                <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-navy-950">
                  {item.type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.src} alt="" className="size-full object-cover" />
                  ) : (
                    // 주소 끝의 #t=0.1 은 첫 장면을 미리보기로 보여 주기 위한 것입니다.
                    <video
                      src={`${item.src}#t=0.1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  )}
                  <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    {item.type === "video" && <FilmIcon className="size-3" />}
                    {item.type === "video" ? "동영상" : "이미지"}
                  </span>
                </div>

                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate font-bold text-slate-900">
                    {item.title || "(제목 없음)"}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        item.active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.active ? "표시 중" : "숨김"}
                    </span>
                    {index + 1}번째
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => run(() => moveHeroMediaAction(item.id, "up"))}
                    disabled={busy || index === 0}
                    aria-label={`'${item.title}' 위로 옮기기`}
                    title="위로"
                    className={iconButtonClass}
                  >
                    <ChevronUpIcon className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => moveHeroMediaAction(item.id, "down"))}
                    disabled={busy || index === items.length - 1}
                    aria-label={`'${item.title}' 아래로 옮기기`}
                    title="아래로"
                    className={iconButtonClass}
                  >
                    <ChevronDownIcon className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => setHeroMediaActiveAction(item.id, !item.active))}
                    disabled={busy}
                    aria-label={`'${item.title}' ${item.active ? "숨기기" : "홈 화면에 표시하기"}`}
                    title={item.active ? "숨기기" : "표시하기"}
                    className={iconButtonClass}
                  >
                    {item.active ? (
                      <EyeIcon className="size-5 text-brand-700" />
                    ) : (
                      <EyeOffIcon className="size-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const message = `'${item.title || "이 항목"}' 을(를) 삭제할까요?\n올린 파일도 함께 지워지며 되돌릴 수 없습니다.`;
                      if (window.confirm(message)) run(() => deleteHeroMediaAction(item.id));
                    }}
                    disabled={busy}
                    aria-label={`'${item.title}' 삭제`}
                    title="삭제"
                    className={`${iconButtonClass} hover:bg-accent-50 hover:text-accent-700`}
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
