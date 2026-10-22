"use client";

import { PrinterIcon } from "@/components/icons";

/** 브라우저의 인쇄 창을 엽니다. */
export function PrintButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => window.print()} className="btn btn-brand btn-sm">
      <PrinterIcon className="size-4" />
      인쇄
    </button>
  );
}
