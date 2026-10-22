import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { today } from "@/lib/dates";
import { drawPayload } from "@/lib/draw/view";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeTournament } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { getDraw } from "@/lib/store/draws";
import { getTournament } from "@/lib/store/tournaments";
import { LiveDraw } from "@/components/draw/LiveDraw";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string; id: string }> };

// 경기 결과가 계속 바뀌므로 미리 만들어 두지 않고 열 때마다 새로 그립니다.
// 그 뒤로는 마감 전까지 화면이 5초마다 app/api/draws/[id] 에서 새 결과를 받아 옵니다.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const { id } = await params;
  const t = getDictionary(lang).draw;
  const stored = await getTournament(id);
  if (!stored) return { title: t.title, robots: { index: false } };
  const tournament = localizeTournament(stored, lang);
  return pageMetadata({
    lang,
    path: `/tournaments/${id}/bracket`,
    title: t.metaTitle(tournament.title),
    description: t.metaDescription(tournament.title),
    image: tournament.images[0],
  });
}

export default async function BracketPage({ params }: Props) {
  const lang = await readLang(params);
  const { id } = await params;
  const admin = await isAdmin();
  // 숨긴 대회는 관리자에게만 보여 줍니다. (관리자 화면에서 미리 확인할 수 있게)
  const [stored, draw] = await Promise.all([
    getTournament(id, { includeHidden: admin }),
    getDraw(id),
  ]);
  if (!stored) notFound();

  const t = getDictionary(lang).draw;
  const tournament = localizeTournament(stored, lang);

  return (
    // 휴대폰에서는 위쪽 여백과 제목을 줄여, 첫 화면에 대진표가 조금이라도 더 보이게 합니다.
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-8 md:py-12">
      <Link
        href={localePath(lang, `/tournaments/${id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        {t.back}
      </Link>
      <header className="mt-3 mb-4 md:mt-4 md:mb-6">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1 className="mt-1.5 text-xl leading-tight font-black break-keep text-brand-950 md:mt-2 md:text-3xl">
          {tournament.title}
        </h1>
      </header>
      {draw ? (
        <LiveDraw
          tournamentId={id}
          lang={lang}
          initial={drawPayload(draw, stored, today())}
          renderedAt={new Date().toISOString()}
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-12 text-center break-keep text-slate-500">
          {t.preparing}
        </p>
      )}
    </div>
  );
}
