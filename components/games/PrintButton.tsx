"use client";

import { PrinterIcon } from "@/components/icons";

/** 친선 경기 인쇄 화면의 '인쇄하기' 단추. 브라우저 인쇄 창을 엽니다. */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-brand">
      <PrinterIcon className="size-5" />
      {label}
    </button>
  );
}
