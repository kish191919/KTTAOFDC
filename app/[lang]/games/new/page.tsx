import type { Metadata } from "next";
import Link from "next/link";
import { today } from "@/lib/dates";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { listPeople } from "@/lib/store/games";
import { NewGameForm } from "@/components/games/NewGameForm";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string }> };

// 새로 쓴 이름이 바로 보이게 열 때마다 저장된 이름을 새로 읽습니다.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const t = getDictionary(lang).games;
  return {
    ...pageMetadata({ lang, path: "/games/new", title: t.newTitle, description: t.metaDescription }),
    robots: { index: false },
  };
}

/** 새 번개 게임 만들기 */
export default async function NewGamePage({ params }: Props) {
  const lang = await readLang(params);
  const t = getDictionary(lang).games;
  const people = await listPeople();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-16 md:py-12">
      <Link
        href={localePath(lang, "/games")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        {t.back}
      </Link>
      <header className="mt-3 mb-8 md:mt-4">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1 className="mt-1.5 text-2xl leading-tight font-black text-brand-950 md:mt-2 md:text-3xl">{t.newTitle}</h1>
        <p className="mt-2 break-keep text-slate-600">{t.newDescription}</p>
      </header>
      <NewGameForm lang={lang} people={people.map((person) => person.name)} today={today()} />
    </div>
  );
}
