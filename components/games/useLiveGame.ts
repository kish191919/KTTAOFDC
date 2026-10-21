"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePayload } from "@/lib/games/play";

/** 새 결과를 받아 오는 간격 */
const INTERVAL_MS = 5000;

/**
 * 친선 경기를 5초마다 새로 받아 옵니다. 화면이 가려져 있는 동안에는 쉬었다가 다시 보이면 바로 받아 옵니다.
 * 내가 저장해서 받은 게임(apply)이 받아 온 것보다 새것이면 그대로 둡니다. (components/draw/useLiveDraw.ts 와 같은 방식)
 */
export function useLiveGame(id: string, initial: GamePayload) {
  const [payload, setPayload] = useState(initial);
  const [online, setOnline] = useState(true);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  /** 그 사이 누군가 게임을 지웠는지 */
  const [gone, setGone] = useState(false);
  const version = useRef(initial.game.version);

  const accept = useCallback((next: GamePayload) => {
    if (next.game.version < version.current) return;
    version.current = next.game.version;
    setPayload(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (response.status === 404) return setGone(true);
      if (!response.ok) throw new Error(String(response.status));
      accept((await response.json()) as GamePayload);
      setOnline(true);
      setCheckedAt(Date.now());
    } catch {
      setOnline(false);
    }
  }, [id, accept]);

  useEffect(() => {
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
  }, [refresh]);

  const apply = useCallback(
    (next: GamePayload) => {
      accept(next);
      setCheckedAt(Date.now());
    },
    [accept],
  );

  return { payload, online, checkedAt, gone, refresh, apply, setGone };
}
