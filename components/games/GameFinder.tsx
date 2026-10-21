"use client";

import { useRouter } from "next/navigation";
import { sameName } from "@/lib/games/names";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { StarIcon } from "@/components/icons";
import { NamePicker } from "./NamePicker";
import { useMe } from "./usePeople";

const recordPath = (lang: Locale, name: string) =>
  `${localePath(lang, "/games")}?name=${encodeURIComponent(name)}`;

/**
 * 친선 경기 홈의 이름 찾기. 전에 쓴 이름을 몇 글자나 초성으로 찾아 누르면 그 사람이 나온 게임과 성적을 보여 줍니다.
 * 이 휴대폰에 내 이름을 저장해 두었으면 '내 기록' 버튼으로 바로 갑니다.
 */
export function GameFinder({ lang, people, current }: { lang: Locale; people: string[]; current: string }) {
  const t = getDictionary(lang).games;
  const router = useRouter();
  const [me] = useMe();
  const go = (name: string) => router.push(recordPath(lang, name));

  return (
    <section aria-labelledby="find-heading" className="card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="find-heading" className="text-lg font-black text-brand-950">
          {t.findTitle}
        </h2>
        {me && !sameName(me, current) && (
          <button type="button" onClick={() => go(me)} className="btn btn-ghost btn-sm">
            <StarIcon className="size-4 text-accent-500" fill="currentColor" />
            {t.myRecord(me)}
          </button>
        )}
      </div>
      <div className="mt-3">
        <NamePicker
          lang={lang}
          taken={[]}
          people={people}
          onPick={(names) => go(names[0])}
          hint={false}
          placeholder={t.findPlaceholder}
          newLabel={t.searchFor}
        />
      </div>
    </section>
  );
}

/** 찾은 이름을 이 휴대폰의 '내 이름'으로 저장하거나 풉니다. 저장하면 새 게임·경기 기록에 바로 넣을 수 있습니다. */
export function SaveMeButton({ lang, name }: { lang: Locale; name: string }) {
  const t = getDictionary(lang).games;
  const [me, setMe] = useMe();
  const saved = Boolean(me && sameName(me, name));
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => setMe(saved ? null : name)}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        saved
          ? "border-accent-200 bg-accent-50 text-accent-700"
          : "border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      }`}
    >
      <StarIcon className="size-3.5" fill={saved ? "currentColor" : "none"} />
      {saved ? t.savedMe : t.saveMe}
    </button>
  );
}
