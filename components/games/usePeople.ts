"use client";

import { useEffect, useState } from "react";
import { useStored } from "@/components/draw/useStored";

// 친선 경기에 쓴 이름 목록(최근에 쓴 순서)과 이 휴대폰에 저장한 '내 이름'.

/** 한 화면에서 이름 목록은 한 번만 받아 옵니다. */
let loading: Promise<string[]> | null = null;

function load(): Promise<string[]> {
  loading ??= fetch("/api/games/people")
    .then((response) => (response.ok ? response.json() : { names: [] }))
    .then((data: { names?: unknown }) =>
      Array.isArray(data.names) ? data.names.filter((n): n is string => typeof n === "string") : [],
    )
    .catch(() => {
      // 다음에 열 때 다시 받아 오게 합니다.
      loading = null;
      return [];
    });
  return loading;
}

/** 저장된 이름 목록. 서버가 그린 화면에서 받은 목록(initial)이 있으면 받아 오지 않습니다. */
export function usePeople(initial?: string[]): string[] {
  const [names, setNames] = useState<string[]>(initial ?? []);
  useEffect(() => {
    if (initial) return;
    let alive = true;
    void load().then((list) => {
      if (alive) setNames(list);
    });
    return () => {
      alive = false;
    };
  }, [initial]);
  return names;
}

/** 이 휴대폰에 저장한 내 이름. 새 게임·경기 기록에 바로 넣고, 순위표에서 '나'로 표시합니다. */
export function useMe(): [string | null, (name: string | null) => void] {
  return useStored("ktta-games:me");
}

/** 게임을 만든 휴대폰에 남겨 두는 관리 열쇠 */
export const ownerKeyStorage = (id: string) => `ktta-game:${id}:key`;
