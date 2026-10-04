"use client";

import { useId, useState, type ChangeEvent } from "react";
import type { Attachment, ImageRef } from "@/lib/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FileIcon,
  UploadIcon,
} from "@/components/icons";
import { uploadDocument, uploadImage, type UploadFolder } from "./upload";

type Progress = { done: number; total: number };

/** 여러 파일을 차례로 올리면서 진행 상황과 실패한 파일을 알려 줍니다. */
function useUploadQueue<T>(
  upload: (file: File) => Promise<T>,
  onUploaded: (item: T) => void,
  /** 앞으로 더 올릴 수 있는 개수 */
  remaining: number,
  onBusyChange?: (busy: boolean) => void,
) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    // 같은 파일을 다시 고를 수 있도록 입력 칸을 비워 둡니다.
    event.target.value = "";
    if (selected.length === 0) return;

    const files = selected.slice(0, remaining);
    const failed: string[] = [];
    if (files.length < selected.length) {
      failed.push(`한도를 넘어 ${selected.length - files.length}개 파일은 올리지 않았습니다.`);
    }

    setErrors([]);
    setProgress({ done: 0, total: files.length });
    onBusyChange?.(true);
    for (const [index, file] of files.entries()) {
      try {
        onUploaded(await upload(file));
      } catch (error) {
        failed.push(error instanceof Error ? error.message : `${file.name}: 올리지 못했습니다.`);
      }
      setProgress({ done: index + 1, total: files.length });
    }
    setErrors(failed);
    setProgress(null);
    onBusyChange?.(false);
  }

  return { progress, errors, handleFiles };
}

function UploadErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1 rounded-xl bg-accent-50 p-3 text-sm text-accent-700" role="alert">
      {errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

type ImageUploaderProps = {
  folder: UploadFolder;
  images: ImageRef[];
  onChange: (update: (images: ImageRef[]) => ImageRef[]) => void;
  onBusyChange?: (busy: boolean) => void;
  max: number;
  /** 첫 번째 이미지에 붙는 표시 (예: 대표 포스터, 표지) */
  firstLabel: string;
  disabled?: boolean;
};

export function ImageUploader({
  folder,
  images,
  onChange,
  onBusyChange,
  max,
  firstLabel,
  disabled,
}: ImageUploaderProps) {
  const inputId = useId();
  const { progress, errors, handleFiles } = useUploadQueue(
    (file) => uploadImage(file, folder),
    (image) => onChange((current) => [...current, image]),
    max - images.length,
    onBusyChange,
  );

  const move = (index: number, delta: number) =>
    onChange((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) =>
    onChange((current) => current.filter((_, position) => position !== index));

  const full = images.length >= max;

  return (
    <div>
      {images.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.src}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={`올린 이미지 ${index + 1}`}
                className="aspect-square w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-accent-600 px-2 py-0.5 text-xs font-bold text-white">
                  {firstLabel}
                </span>
              )}
              <div className="flex items-center justify-between gap-1 border-t border-slate-200 bg-white p-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={`이미지 ${index + 1} 앞으로 옮기기`}
                    className="rounded-md p-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={disabled || index === images.length - 1}
                    aria-label={`이미지 ${index + 1} 뒤로 옮기기`}
                    className="rounded-md p-1.5 text-slate-600 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-30"
                  >
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  aria-label={`이미지 ${index + 1} 빼기`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-30"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label
        htmlFor={inputId}
        className={`btn btn-ghost btn-sm ${
          disabled || progress || full ? "pointer-events-none opacity-60" : "cursor-pointer"
        }`}
      >
        <UploadIcon className="size-4" />
        {progress
          ? `올리는 중… (${progress.done}/${progress.total})`
          : full
            ? `최대 ${max}장까지 올릴 수 있습니다`
            : "이미지 선택"}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={disabled || Boolean(progress) || full}
        onChange={handleFiles}
      />
      <UploadErrors errors={errors} />
    </div>
  );
}

type FileUploaderProps = {
  folder: UploadFolder;
  files: Attachment[];
  onChange: (update: (files: Attachment[]) => Attachment[]) => void;
  onBusyChange?: (busy: boolean) => void;
  max: number;
  disabled?: boolean;
};

export function FileUploader({
  folder,
  files,
  onChange,
  onBusyChange,
  max,
  disabled,
}: FileUploaderProps) {
  const inputId = useId();
  const { progress, errors, handleFiles } = useUploadQueue(
    (file) => uploadDocument(file, folder),
    (item) => onChange((current) => [...current, item]),
    max - files.length,
    onBusyChange,
  );
  const full = files.length >= max;

  return (
    <div>
      {files.length > 0 && (
        <ul className="mb-4 space-y-2">
          {files.map((file, index) => (
            <li
              key={file.url}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5"
            >
              <FileIcon className="size-5 shrink-0 text-brand-700" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                {file.name}
              </span>
              <button
                type="button"
                onClick={() =>
                  onChange((current) => current.filter((_, position) => position !== index))
                }
                disabled={disabled}
                aria-label={`${file.name} 빼기`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-30"
              >
                <CloseIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label
        htmlFor={inputId}
        className={`btn btn-ghost btn-sm ${
          disabled || progress || full ? "pointer-events-none opacity-60" : "cursor-pointer"
        }`}
      >
        <UploadIcon className="size-4" />
        {progress
          ? `올리는 중… (${progress.done}/${progress.total})`
          : full
            ? `최대 ${max}개까지 올릴 수 있습니다`
            : "파일 선택"}
      </label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.jpg,.jpeg,.png,.webp,.gif"
        multiple
        className="sr-only"
        disabled={disabled || Boolean(progress) || full}
        onChange={handleFiles}
      />
      <UploadErrors errors={errors} />
    </div>
  );
}
