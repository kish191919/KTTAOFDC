import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dateOf, formatDate } from "@/lib/dates";
import { publicGame } from "@/lib/games/play";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { siteUrl } from "@/lib/site";
import { getGame } from "@/lib/store/games";
import { clockTime } from "@/components/draw/labels";
import { FreeRecordSheet, LeagueRecordSheets, ResultsSheet, type PrintInfo } from "@/components/games/GamePrint";
import { PrintButton } from "@/components/games/PrintButton";
import { ArrowLeftIcon } from "@/components/icons";

type Props = {
  params: Promise<{ lang: string; id: string }>;
  searchParams: Promise<{ sheet?: string | string[] }>;
};

type Kind = "results" | "record";

// 열 때마다 지금 결과로 그립니다.
export const dynamic = "force-dynamic";

// 인쇄할 때는 사이트 머리글·바닥글과 이 페이지의 안내를 빼고 종이만 찍습니다. (대회 기록지 인쇄와 같은 방식)
// 배경색(순위표 머리 칸 등)은 브라우저가 기본으로 빼므로 종이에만 그대로 찍도록 합니다.
const PRINT_CSS = `
@page { size: letter portrait; margin: 0.5in; }
@media print {
  body > header, body > footer { display: none !important; }
  main, main > div { background: none !important; min-height: 0 !important; }
  .sheet-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet-page ~ .sheet-page { break-before: page; }
}
`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const { id } = await params;
  const t = getDictionary(lang).games;
  const game = await getGame(id);
  return {
    title: game ? `${t.printing.title} · ${game.title}` : t.title,
    robots: { index: false },
  };
}

/** 친선 경기 인쇄: 지금까지의 결과표, 또는 손으로 점수를 적는 기록지 (?sheet=record). 누구나 씁니다. */
export default async function GamePrintPage({ params, searchParams }: Props) {
  const lang = await readLang(params);
  const { id } = await params;
  const { sheet } = await searchParams;
  const stored = await getGame(id);
  if (!stored) notFound();
  const game = publicGame(stored);
  const t = getDictionary(lang).games;
  const p = t.printing;
  const kind: Kind = sheet === "record" ? "record" : "results";
  const league = game.format === "league";
  const gamePath = localePath(lang, `/games/${id}`);
  const now = new Date().toISOString();
  const info: PrintInfo = {
    lang,
    url: `${siteUrl()}${gamePath}`,
    date: formatDate(dateOf(game.createdAt), true, lang),
    time: `${formatDate(dateOf(now), false, lang)} ${clockTime(now, lang)}`,
  };
  const hrefOf = (next: Kind) => `${localePath(lang, `/games/${id}/print`)}${next === "record" ? "?sheet=record" : ""}`;
  const help = [
    kind === "results" ? p.resultsHelp : league ? p.recordLeagueHelp : p.recordFreeHelp,
    ...(kind === "results" ? [p.asOfHelp(clockTime(now, lang))] : []),
    p.qrHelp,
    p.paperHelp,
  ];

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-8 md:pt-10 print:hidden">
        <Link
          href={gamePath}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeftIcon className="size-4" />
          {p.backToGame}
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-brand-950 md:text-3xl">{p.title}</h1>
            <p className="mt-1 break-keep text-slate-500">{game.title}</p>
          </div>
          <PrintButton label={p.printNow} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["results", "record"] as const).map((option) => (
            <Link
              key={option}
              href={hrefOf(option)}
              replace
              aria-current={kind === option ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                kind === option
                  ? "bg-brand-700 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {p[option]}
            </Link>
          ))}
        </div>

        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm leading-relaxed break-keep text-slate-600">
          {help.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* 좁은 화면에서는 종이를 줄이지 않고 옆으로 밀어 봅니다. */}
      <div className="overflow-x-auto px-4 pb-16 print:overflow-visible print:p-0">
        <div className="flex flex-col gap-8 print:block">
          {kind === "results" ? (
            <ResultsSheet game={game} info={info} />
          ) : league ? (
            <LeagueRecordSheets game={game} info={info} />
          ) : (
            <FreeRecordSheet game={game} info={info} />
          )}
        </div>
      </div>
    </>
  );
}
