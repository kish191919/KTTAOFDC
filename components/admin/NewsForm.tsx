"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { FormState } from "@/lib/actions";
import type { Attachment, ImageRef, NewsPost } from "@/lib/types";
import { HiddenField } from "./HiddenControls";
import { Section } from "./Section";
import { FileUploader, ImageUploader } from "./Uploaders";

type Props = {
  post?: NewsPost;
  /** 새 소식을 쓸 때 날짜 칸에 미리 넣어 둘 날짜 (YYYY-MM-DD) */
  defaultDate?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** 저장할 수 없는 환경(읽기 전용)일 때 true */
  readOnly?: boolean;
};

export function NewsForm({ post, defaultDate, action, readOnly = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [images, setImages] = useState<ImageRef[]>(post?.images ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(post?.attachments ?? []);
  const [uploading, setUploading] = useState(0);

  const busy = pending || uploading > 0;
  const trackUploads = (isBusy: boolean) =>
    setUploading((count) => count + (isBusy ? 1 : -1));

  // 서버에서 입력 오류를 돌려줘도 적어 둔 내용이 지워지지 않도록 직접 제출합니다.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("images", JSON.stringify(images));
    formData.set("attachments", JSON.stringify(attachments));
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
      <Section title="기본 정보">
        <div>
          <label htmlFor="title" className="label">
            제목 <span className="text-accent-600">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={150}
            defaultValue={post?.title}
            placeholder="예) 한인탁구협회, 가을 친선 탁구대회 성황리에 마쳐"
            className="field"
          />
          {fieldError("title")}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="label">
              날짜 <span className="text-accent-600">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={post?.date ?? defaultDate}
              className="field"
            />
            <p className="hint">기사가 실린 날짜나 글을 올리는 날짜입니다.</p>
            {fieldError("date")}
          </div>
          <div>
            <label htmlFor="source" className="label">
              출처
            </label>
            <input
              id="source"
              name="source"
              maxLength={100}
              defaultValue={post?.source}
              placeholder="예) 한국일보"
              className="field"
            />
            <p className="hint">신문 기사라면 실린 신문 이름을 적습니다.</p>
          </div>
        </div>
        <div>
          <label htmlFor="linkUrl" className="label">
            원문 링크
          </label>
          <input
            id="linkUrl"
            name="linkUrl"
            type="url"
            maxLength={500}
            defaultValue={post?.linkUrl}
            placeholder="https:// (기사 원문, 관련 홈페이지 등)"
            className="field"
          />
          <p className="hint">주소를 적으면 글 아래에 원문으로 가는 버튼이 생깁니다.</p>
          {fieldError("linkUrl")}
        </div>
      </Section>

      <Section
        title="내용"
        description="줄바꿈은 그대로 보이고, 웹 주소와 이메일은 자동으로 링크가 됩니다. 기사 사진만 올릴 때는 비워 두어도 됩니다."
      >
        <div>
          <label htmlFor="body" className="sr-only">
            내용
          </label>
          <textarea
            id="body"
            name="body"
            rows={12}
            maxLength={30000}
            defaultValue={post?.body}
            className="field leading-relaxed"
          />
        </div>
      </Section>

      <Section
        title="이미지"
        description="신문 기사를 찍은 사진이나 관련 사진을 올립니다. 이미지는 글 위에 보입니다. 첫 번째 이미지가 목록에 보이는 대표 이미지입니다. 화살표로 순서를 바꾸거나, ‘대표로 지정’을 눌러 한 번에 맨 앞으로 보낼 수 있습니다."
      >
        <ImageUploader
          folder="news"
          images={images}
          onChange={setImages}
          onBusyChange={trackUploads}
          max={20}
          firstLabel="대표"
          disabled={readOnly || pending}
        />
        {fieldError("images")}
      </Section>

      <Section title="첨부 파일" description="안내문 PDF, 신청서 등을 올리면 글 아래에서 내려받을 수 있습니다.">
        <FileUploader
          folder="news"
          files={attachments}
          onChange={setAttachments}
          onBusyChange={trackUploads}
          max={10}
          disabled={readOnly || pending}
        />
        {fieldError("attachments")}
      </Section>

      <Section title="공개 설정">
        <HiddenField defaultChecked={post?.hidden} />
      </Section>

      {state.error && (
        <p className="rounded-xl bg-accent-50 px-4 py-3 font-medium text-accent-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link href="/admin" className="btn btn-ghost">
          취소
        </Link>
        <button type="submit" disabled={busy || readOnly} className="btn btn-brand">
          {pending
            ? "저장하는 중…"
            : uploading > 0
              ? "파일 올리는 중…"
              : post
                ? "수정 내용 저장"
                : "소식 등록"}
        </button>
      </div>
    </form>
  );
}
