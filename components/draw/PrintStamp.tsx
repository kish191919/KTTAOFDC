"use client";

import { useSyncExternalStore } from "react";
import { printedLabel } from "./labels";

// 기록지 아래의 '출력' 시각. 페이지를 연 때가 아니라 실제로 인쇄한 때를 찍습니다.
// 관리자 화면은 이 시각으로 "오후 1:05 에 뽑은 B조 기록지"를 가리키므로 종이와 같아야 합니다.
// 인쇄 단추(components/admin/PrintControls.tsx)가 인쇄 직전에 setPrintStamp 로 시각을 정합니다.

let stamp: string | null = null;
const listeners = new Set<() => void>();

export function setPrintStamp(at: string) {
  stamp = at;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** 종이에 찍는 출력 시각. 인쇄하기 전에는 페이지를 연 시각(initial)을 보여 줍니다. */
export function PrintedTime({ initial }: { initial: string }) {
  const at = useSyncExternalStore(
    subscribe,
    () => stamp,
    () => null,
  );
  return <span suppressHydrationWarning>{printedLabel(at ?? initial)}</span>;
}
