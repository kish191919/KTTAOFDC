"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { FormState } from "@/lib/actions";
import type { Attachment, ImageRef, Tournament } from "@/lib/types";
import { HiddenField } from "./HiddenControls";
import { Section } from "./Section";
import { FileUploader, ImageUploader } from "./Uploaders";

type Props = {
  tournament?: Tournament;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** 저장할 수 없는 환경(읽기 전용)일 때 true */
  readOnly?: boolean;
};

export function TournamentForm({ tournament, action, readOnly = false }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [images, setImages] = useState<ImageRef[]>(tournament?.images ?? []);
  const [attachments, setAttachments] = useState<Attachment[]>(
    tournament?.attachments ?? [],
  );
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
            대회 이름 <span className="text-accent-600">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={150}
            defaultValue={tournament?.title}
            placeholder="예) 제1회 VA-MD 가을 친선 탁구대회"
            className="field"
          />
          {fieldError("title")}
        </div>
        <div>
          <label htmlFor="summary" className="label">
            한 줄 소개
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={2}
            maxLength={500}
            defaultValue={tournament?.summary}
            placeholder="제목 아래에 보이는 짧은 안내 문구"
            className="field"
          />
        </div>
      </Section>

      <Section title="일시와 장소" description="시간은 대회가 열리는 곳의 현지 시각으로 적습니다.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="label">
              시작 날짜 <span className="text-accent-600">*</span>
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={tournament?.startDate}
              className="field"
            />
            {fieldError("startDate")}
          </div>
          <div>
            <label htmlFor="startTime" className="label">
              시작 시간
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              defaultValue={tournament?.startTime}
              className="field"
            />
            {fieldError("startTime")}
          </div>
          <div>
            <label htmlFor="endDate" className="label">
              종료 날짜
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={tournament?.endDate}
              className="field"
            />
            <p className="hint">하루짜리 대회는 비워 두세요.</p>
            {fieldError("endDate")}
          </div>
          <div>
            <label htmlFor="endTime" className="label">
              종료 시간
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              defaultValue={tournament?.endTime}
              className="field"
            />
            {fieldError("endTime")}
          </div>
        </div>
        <div>
          <label htmlFor="venue" className="label">
            장소 이름
          </label>
          <input
            id="venue"
            name="venue"
            maxLength={150}
            defaultValue={tournament?.venue}
            placeholder="예) Korean Central Presbyterian Church"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="address" className="label">
            주소
          </label>
          <input
            id="address"
            name="address"
            maxLength={250}
            defaultValue={tournament?.address}
            placeholder="예) 15451 US-29, Centreville, VA 20121"
            className="field"
          />
          <p className="hint">주소를 적으면 상세 페이지에 지도 버튼이 생깁니다.</p>
        </div>
      </Section>

      <Section title="참가 안내" description="해당하는 항목만 적으면 됩니다. 비워 둔 항목은 보이지 않습니다.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="organizer" className="label">
              주최 · 주관
            </label>
            <input
              id="organizer"
              name="organizer"
              maxLength={150}
              defaultValue={tournament?.organizer}
              className="field"
            />
          </div>
          <div>
            <label htmlFor="fee" className="label">
              참가비
            </label>
            <input
              id="fee"
              name="fee"
              maxLength={150}
              defaultValue={tournament?.fee}
              placeholder="예) 팀당 $60"
              className="field"
            />
          </div>
          <div>
            <label htmlFor="deadline" className="label">
              신청 마감일
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              defaultValue={tournament?.deadline}
              className="field"
            />
            {fieldError("deadline")}
          </div>
          <div>
            <label htmlFor="contact" className="label">
              문의
            </label>
            <input
              id="contact"
              name="contact"
              maxLength={300}
              defaultValue={tournament?.contact}
              placeholder="예) 홍길동 703-000-0000"
              className="field"
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="linkUrl" className="label">
              관련 링크
            </label>
            <input
              id="linkUrl"
              name="linkUrl"
              type="url"
              maxLength={500}
              defaultValue={tournament?.linkUrl}
              placeholder="https:// (신청서, 대회 홈페이지 등)"
              className="field"
            />
            {fieldError("linkUrl")}
          </div>
          <div>
            <label htmlFor="linkLabel" className="label">
              링크 버튼 이름
            </label>
            <input
              id="linkLabel"
              name="linkLabel"
              maxLength={40}
              defaultValue={tournament?.linkLabel}
              placeholder="예) 참가 신청하기"
              className="field"
            />
          </div>
        </div>
      </Section>

      <Section
        title="대회 소개"
        description="포스터에 없는 안내나 대회 결과(입상자 명단)처럼 꼭 읽어야 할 내용만 적습니다. 상세 페이지에 항상 펼쳐서 보입니다. 줄바꿈은 그대로 보이고, 웹 주소와 이메일은 자동으로 링크가 됩니다."
      >
        <div>
          <label htmlFor="body" className="sr-only">
            대회 소개
          </label>
          <textarea
            id="body"
            name="body"
            rows={8}
            maxLength={30000}
            defaultValue={tournament?.body}
            className="field leading-relaxed"
          />
        </div>
      </Section>

      <Section
        title="요강 전문"
        description="포스터나 요강의 글을 그대로 옮겨 적는 곳입니다. 포스터와 내용이 겹치므로 상세 페이지에는 접힌 채로 보이고, 방문자가 누르면 펼쳐집니다. 비워 두어도 됩니다."
      >
        <div>
          <label htmlFor="fullText" className="sr-only">
            요강 전문
          </label>
          <textarea
            id="fullText"
            name="fullText"
            rows={10}
            maxLength={30000}
            defaultValue={tournament?.fullText}
            className="field leading-relaxed"
          />
        </div>
      </Section>

      <Section
        title="포스터 · 이미지"
        description="첫 번째 이미지가 목록에 보이는 대표 포스터입니다. 화살표로 순서를 바꾸거나, ‘대표로 지정’을 눌러 한 번에 맨 앞으로 보낼 수 있습니다."
      >
        <ImageUploader
          folder="tournaments"
          images={images}
          onChange={setImages}
          onBusyChange={trackUploads}
          max={20}
          firstLabel="대표"
          disabled={readOnly || pending}
        />
        {fieldError("images")}
      </Section>

      <Section title="첨부 파일" description="요강 PDF, 신청서 등을 올리면 상세 페이지에서 내려받을 수 있습니다.">
        <FileUploader
          folder="tournaments"
          files={attachments}
          onChange={setAttachments}
          onBusyChange={trackUploads}
          max={10}
          disabled={readOnly || pending}
        />
        {fieldError("attachments")}
      </Section>

      <Section title="공개 설정">
        <HiddenField defaultChecked={tournament?.hidden} />
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
              : tournament
                ? "수정 내용 저장"
                : "대회 등록"}
        </button>
      </div>
    </form>
  );
}
