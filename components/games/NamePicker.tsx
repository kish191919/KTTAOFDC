"use client";

import { useRef, useState } from "react";
import { sameName, searchNames, splitNames } from "@/lib/games/names";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { PlusIcon, SearchIcon, StarIcon } from "@/components/icons";
import { useMe, usePeople } from "./usePeople";

/** 이름을 적지 않았을 때 보여 주는 최근 이름 수 */
const RECENT = 15;
/** 이름을 적었을 때 보여 주는 맞는 이름 수 */
const FOUND = 12;

/**
 * 이름 고르기. 전에 번개 게임에 쓴 이름을 몇 글자나 초성으로 찾아 누르면 바로 들어갑니다.
 * 처음 쓰는 이름은 적고 '새 이름으로 넣기'(또는 Enter)를 누릅니다. 여러 이름을 쉼표·줄바꿈으로 붙여 넣어도 됩니다.
 * 이 휴대폰에 '내 이름'을 저장해 두었으면 맨 앞에 '나'로 보여 줍니다.
 */
export function NamePicker({
  lang,
  taken,
  onPick,
  first = [],
  people,
  hint = true,
  autoFocus = false,
  placeholder,
  newLabel,
}: {
  lang: Locale;
  /** 이미 고른 이름. 목록에서 빼고, 다시 넣지 않습니다. */
  taken: string[];
  onPick: (names: string[]) => void;
  /** 저장된 이름보다 앞에 둘 이름 (이 게임의 선수) */
  first?: string[];
  /** 서버가 함께 보낸 저장된 이름 목록. 없으면 처음 열 때 받아 옵니다. */
  people?: string[];
  /** 입력 칸 아래 쓰는 법 안내 */
  hint?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  /** 처음 보는 이름을 넣는 버튼의 글. 주지 않으면 '새 이름으로 넣기'입니다. (이름 찾기에서는 '찾기') */
  newLabel?: (name: string) => string;
}) {
  const t = getDictionary(lang).games;
  const stored = usePeople(people);
  const [me] = useMe();
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const isTaken = (name: string) => taken.some((x) => sameName(x, name));
  // 이 게임의 선수 → 저장된 이름 순서로, 같은 사람은 한 번만
  const pool: string[] = [];
  for (const name of [...first, ...stored]) {
    if (!isTaken(name) && !pool.some((x) => sameName(x, name))) pool.push(name);
  }
  const showMe = me && !isTaken(me) && !query ? me : null;
  const shown = searchNames(
    pool.filter((name) => !showMe || !sameName(name, showMe)),
    query,
    query ? FOUND : RECENT,
  );
  const typed = query.replace(/\s+/g, " ").trim();
  const exact = typed ? pool.find((name) => sameName(name, typed)) : undefined;

  function pick(names: string[]) {
    const fresh: string[] = [];
    for (const name of names) {
      if (!isTaken(name) && !fresh.some((x) => sameName(x, name))) fresh.push(name);
    }
    if (fresh.length > 0) onPick(fresh);
    setQuery("");
    input.current?.focus();
  }

  /** 누르면 바로 들어가는 이름들. 저장한 내 이름이 맨 앞입니다. */
  const chips = [
    ...(showMe ? [{ name: showMe, mine: true }] : []),
    ...shown.map((name) => ({ name, mine: false })),
  ];

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
        <input
          ref={input}
          type="text"
          value={query}
          autoFocus={autoFocus}
          enterKeyHint="done"
          autoComplete="off"
          placeholder={placeholder ?? t.nameSearch}
          aria-label={placeholder ?? t.nameSearch}
          onChange={(e) => setQuery(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            // 여러 이름을 한꺼번에 붙여 넣으면 나눠서 모두 넣습니다.
            if (/[\r\n,，、;]/.test(text)) {
              e.preventDefault();
              pick(splitNames(text));
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (typed) pick([exact ?? typed]);
          }}
          className="field pl-11"
        />
      </div>
      {hint && <p className="hint break-keep">{t.nameSearchHint}</p>}
      {(chips.length > 0 || typed) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map(({ name, mine }) => (
            <button
              key={name}
              type="button"
              onClick={() => pick([name])}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
            >
              {mine && (
                <>
                  <StarIcon className="size-3.5 text-accent-500" fill="currentColor" />
                  <span className="text-accent-700">{t.me}</span>
                </>
              )}
              {name}
              <PlusIcon className="size-3.5 text-slate-400" />
            </button>
          ))}
          {typed && !exact && !isTaken(typed) && (
            <button
              type="button"
              onClick={() => pick([typed])}
              className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-100"
            >
              <PlusIcon className="size-3.5" />
              {(newLabel ?? t.addNew)(typed)}
            </button>
          )}
          {typed && isTaken(typed) && (
            <span className="px-1 py-1.5 text-sm text-slate-500">{t.alreadyIn(typed)}</span>
          )}
        </div>
      )}
    </div>
  );
}
