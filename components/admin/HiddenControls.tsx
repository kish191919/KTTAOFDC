"use client";

import { useTransition } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

/** 대회·앨범·소식 입력 화면의 '방문자에게 숨기기' 체크 칸 */
export function HiddenField({ defaultChecked }: { defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name="hidden"
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-brand-700"
      />
      <span>
        <span className="block font-semibold text-slate-800">방문자에게 숨기기</span>
        <span className="hint block break-keep">
          체크해 두면 관리자 화면에서만 보입니다. 내용을 다 채운 뒤 체크를 풀고 저장하면
          공개됩니다.
        </span>
      </span>
    </label>
  );
}

type ToggleProps = {
  hidden: boolean;
  /** 숨길지(true) 보일지(false)를 받아 저장하는 서버 액션 */
  action: (hidden: boolean) => Promise<void>;
};

/** 관리자 목록에서 한 번 눌러 숨기거나 다시 보이게 하는 버튼 */
export function HiddenToggle({ hidden, action }: ToggleProps) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => action(!hidden))}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {hidden ? <EyeIcon className="size-4" /> : <EyeOffIcon className="size-4" />}
      {hidden ? "보이기" : "숨기기"}
    </button>
  );
}
