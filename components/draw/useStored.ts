"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

// 이 브라우저(휴대폰)에만 남겨 두는 작은 값: 저장한 '내 팀', 마지막으로 본 탭.
// 서버에는 보내지 않습니다. 사생활 보호 창처럼 저장이 막힌 브라우저에서는 그 화면에서만 기억합니다.

/** 같은 화면 안에서 값이 바뀌었음을 알리는 이벤트 (storage 이벤트는 다른 탭에만 갑니다) */
const CHANGED = "ktta-draw-stored";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * localStorage 에 남기는 글 하나. 서버가 그린 첫 화면은 값이 없는 것으로 그리고, 브라우저에서 바로 채웁니다.
 * null 을 넣으면 지웁니다.
 */
export function useStored(key: string): [string | null, (value: string | null) => void] {
  const stored = useSyncExternalStore(subscribe, () => read(key), () => null);
  // 저장이 막혀 있어도 고른 값이 이 화면에서는 바로 보이게 따로 들고 있습니다.
  const [local, setLocal] = useState<{ value: string | null } | null>(null);

  const set = useCallback(
    (value: string | null) => {
      setLocal({ value });
      try {
        if (value === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
        window.dispatchEvent(new Event(CHANGED));
      } catch {
        // 저장이 막힌 브라우저: 이 화면에서만 기억합니다.
      }
    },
    [key],
  );

  return [local ? local.value : stored, set];
}
