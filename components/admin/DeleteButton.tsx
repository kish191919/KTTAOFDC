"use client";

import { useTransition } from "react";
import { TrashIcon } from "@/components/icons";

type Props = {
  action: () => Promise<void>;
  /** 삭제 전에 한 번 더 물어볼 문구 */
  confirmMessage: string;
};

export function DeleteButton({ action, confirmMessage }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmMessage)) startTransition(() => action());
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <TrashIcon className="size-4" />
      {pending ? "삭제 중…" : "삭제"}
    </button>
  );
}
