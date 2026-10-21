"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";

// 실시간 대진표의 창 껍데기: 어두운 배경, Esc·배경 누르면 닫기, 뒤 화면 스크롤 잠금.
// 휴대폰에서는 아래에서 올라오는 판, 넓은 화면에서는 가운데 창입니다. (점수 입력 창, 테이블 고르기 창)
// footer(저장 버튼)는 창 아래에 붙여 두어, 작은 휴대폰에서 창이 화면보다 길어도 늘 보입니다.

export function Dialog({
  eyebrow,
  title,
  closeLabel,
  onClose,
  children,
  footer,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-950/70 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-accent-600">{eyebrow}</p>
            <h2 id={titleId} className="mt-0.5 text-lg font-black text-brand-950">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mt-1 -mr-1 rounded-full p-2 text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>
        {children}
        {footer && (
          // 창의 안쪽 여백만큼 아래로 내려 붙여야 창 끝에 딱 붙습니다. (sticky 는 여백 안쪽에서 멈춥니다)
          <div className="sticky -bottom-5 -mx-5 -mb-5 mt-5 border-t border-slate-100 bg-white px-5 py-4 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
