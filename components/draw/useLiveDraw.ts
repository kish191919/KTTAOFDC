"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawPayload } from "@/lib/draw/view";
import type { Draw } from "@/lib/types";

/** 새 결과를 받아 오는 간격 */
const INTERVAL_MS = 5000;

/**
 * 실시간 대진표를 5초마다 새로 받아 옵니다. 화면이 가려져 있는 동안에는 쉬었다가 다시 보이면 바로 받아 옵니다.
 * 마감한 대진표는 더 바뀌지 않으므로 받아 오지 않습니다. (마감을 풀면 다시 받아 옵니다)
 * 내가 저장해서 받은 대진표(setDraw·setPayload)가 받아 온 것보다 새것이면 그대로 둡니다. (version 비교)
 */
export function useLiveDraw(tournamentId: string, initial: DrawPayload) {
  const [payload, setLatest] = useState(initial);
  const [online, setOnline] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const version = useRef(initial.draw.version);

  const accept = useCallback((next: DrawPayload) => {
    if (next.draw.version < version.current) return;
    version.current = next.draw.version;
    setLatest(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/draws/${encodeURIComponent(tournamentId)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(String(response.status));
      accept((await response.json()) as DrawPayload);
      setOnline(true);
      setCheckedAt(Date.now());
    } catch {
      setOnline(false);
    }
  }, [tournamentId, accept]);

  const closed = payload.closed;
  useEffect(() => {
    if (closed) return;
    let timer: number | undefined;
    let stopped = false;
    const schedule = () => {
      timer = window.setTimeout(async () => {
        if (document.visibilityState === "visible") await refresh();
        if (!stopped) schedule();
      }, INTERVAL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, closed]);

  /** 점수 입력처럼 대진표만 돌려받은 저장. 점수 입력·마감 상태는 그대로 둡니다. */
  const setDraw = useCallback(
    (draw: Draw) => {
      accept({ ...payload, draw });
      setCheckedAt(Date.now());
    },
    [accept, payload],
  );

  /** 관리자 조작처럼 점수 입력·마감 상태까지 돌려받은 저장 */
  const setPayload = useCallback(
    (next: DrawPayload) => {
      accept(next);
      setCheckedAt(Date.now());
    },
    [accept],
  );

  return { payload, online, checkedAt, refresh, setDraw, setPayload };
}
