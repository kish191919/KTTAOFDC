"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { FormState } from "@/lib/actions";
import type { Album, ImageRef, VideoRef } from "@/lib/types";
import { HiddenField } from "./HiddenControls";
import { ImageUploader, VideoUploader } from "./Uploaders";

type Props = {
  album?: Album;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

export function AlbumForm({ album, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [photos, setPhotos] = useState<ImageRef[]>(album?.photos ?? []);
  const [videos, setVideos] = useState<VideoRef[]>(album?.videos ?? []);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const uploading = uploadingPhotos || uploadingVideos;

  // 서버에서 입력 오류를 돌려줘도 적어 둔 내용이 지워지지 않도록 직접 제출합니다.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("photos", JSON.stringify(photos));
    formData.set("videos", JSON.stringify(videos));
    startTransition(() => formAction(formData));
  }

  const fieldError = (name: string) =>
    state.fields?.[name] ? (
      <p className="mt-1.5 text-sm font-medium text-accent-700" role="alert">
        {state.fields[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card space-y-5 p-6 md:p-7">
        <div>
          <label htmlFor="title" className="label">
            앨범 이름 <span className="text-accent-600">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={150}
            defaultValue={album?.title}
            placeholder="예) 제1회 VA-MD 가을 친선 탁구대회"
            className="field"
          />
          {fieldError("title")}
        </div>
        <div className="sm:max-w-xs">
          <label htmlFor="date" className="label">
            행사 날짜 <span className="text-accent-600">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={album?.date}
            className="field"
          />
          {fieldError("date")}
        </div>
        <div>
          <label htmlFor="description" className="label">
            설명
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={album?.description}
            className="field"
          />
        </div>
      </div>

      <div className="card p-6 md:p-7">
        <h2 className="text-lg font-black text-brand-950">영어 화면용 (English)</h2>
        <p className="mt-1 mb-5 text-sm break-keep text-slate-500">
          영어 화면(/en)에 보여 줄 글입니다. 비워 둔 칸은 영어 화면에도 한국어 글이 그대로 나옵니다.
        </p>
        <div className="space-y-5">
          <div>
            <label htmlFor="en_title" className="label">
              앨범 이름 (영어)
            </label>
            <input
              id="en_title"
              name="en_title"
              lang="en"
              maxLength={150}
              defaultValue={album?.en?.title}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="en_description" className="label">
              설명 (영어)
            </label>
            <textarea
              id="en_description"
              name="en_description"
              lang="en"
              rows={3}
              maxLength={1000}
              defaultValue={album?.en?.description}
              className="field"
            />
          </div>
        </div>
      </div>

      <div className="card p-6 md:p-7">
        <h2 className="text-lg font-black text-brand-950">사진</h2>
        <p className="mt-1 mb-5 text-sm break-keep text-slate-500">
          여러 장을 한꺼번에 고를 수 있습니다. 첫 번째 사진이 앨범 표지가 됩니다. 다른 사진의
          ‘표지로 지정’을 누르면 그 사진이 맨 앞으로 옵니다.
        </p>
        <ImageUploader
          folder="gallery"
          images={photos}
          onChange={setPhotos}
          onBusyChange={setUploadingPhotos}
          max={300}
          firstLabel="표지"
          disabled={pending}
        />
        {fieldError("photos")}
      </div>

      <div className="card p-6 md:p-7">
        <h2 className="text-lg font-black text-brand-950">동영상</h2>
        <p className="mt-1 mb-5 text-sm break-keep text-slate-500">
          앨범 화면에서 사진 아래에 따로 모아 보여 주고, 누르면 그 자리에서 재생됩니다. 올리지
          않아도 됩니다.
        </p>
        <VideoUploader
          videos={videos}
          onChange={setVideos}
          onBusyChange={setUploadingVideos}
          max={150}
          disabled={pending}
        />
        {fieldError("videos")}
      </div>

      <div className="card p-6 md:p-7">
        <h2 className="mb-5 text-lg font-black text-brand-950">공개 설정</h2>
        <HiddenField defaultChecked={album?.hidden} />
      </div>

      {state.error && (
        <p className="rounded-xl bg-accent-50 px-4 py-3 font-medium text-accent-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin/albums" className="btn btn-ghost">
          취소
        </Link>
        <button type="submit" disabled={pending || uploading} className="btn btn-brand">
          {pending
            ? "저장하는 중…"
            : uploading
              ? uploadingVideos
                ? "동영상 올리는 중…"
                : "사진 올리는 중…"
              : album
                ? "수정 내용 저장"
                : "앨범 만들기"}
        </button>
      </div>
    </form>
  );
}
