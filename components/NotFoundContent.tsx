"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeOfPath, localePath } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { PaddleMark } from "@/components/icons";

type Text = Dictionary["notFound"];

/** '페이지를 찾을 수 없습니다' 안내. 주소가 /en 으로 시작하면 영어로 보여 줍니다. */
export function NotFoundContent({ ko, en }: { ko: Text; en: Text }) {
  const lang = localeOfPath(usePathname());
  const t = lang === "en" ? en : ko;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <PaddleMark className="size-20" />
      <h1 className="mt-6 text-3xl font-black text-brand-950">{t.title}</h1>
      <p className="mt-3 break-keep text-slate-600">{t.description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={localePath(lang, "/")} className="btn btn-brand">
          {t.home}
        </Link>
        <Link href={localePath(lang, "/tournaments")} className="btn btn-outline">
          {t.tournaments}
        </Link>
      </div>
    </div>
  );
}
