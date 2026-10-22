import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { dateOf, formatDate, formatSchedule } from "@/lib/dates";
import { withGroupTables } from "@/lib/draw/play";
import { isByeMatch } from "@/lib/draw/view";
import { siteUrl } from "@/lib/site";
import { getDraw } from "@/lib/store/draws";
import { getTournament } from "@/lib/store/tournaments";
import type { DrawEvent } from "@/lib/types";
import { PrintButton } from "@/components/admin/PrintButton";
import { clockTime } from "@/components/draw/labels";
import { GroupSheets, KnockoutSheets, type SheetInfo } from "@/components/draw/ScoreSheets";
import { ArrowLeftIcon } from "@/components/icons";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type Stage = "group" | "knockout";

export const metadata: Metadata = { title: "기록지 인쇄" };

// 인쇄할 때는 사이트 머리글·바닥글과 이 페이지의 안내를 빼고, 기록지를 한 장에 하나씩 찍습니다.
// 배경색(조 이름 칸 등)은 브라우저가 기본으로 빼므로 기록지에만 그대로 찍도록 합니다.
const PRINT_CSS = `
@page { size: letter portrait; margin: 0.5in; }
@media print {
  body > header, body > footer { display: none !important; }
  main, main > div { background: none !important; min-height: 0 !important; }
  .sheet-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet-page ~ .sheet-page { break-before: page; }
}
`;

/** 대진표의 경기 기록지를 뽑는 화면. ?event= 로 종목 하나만, ?stage=knockout 으로 본선 기록지를 고릅니다. */
export default async function DrawPrintPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const [tournament, stored] = await Promise.all([
    getTournament(id, { includeHidden: true }),
    getDraw(id),
  ]);
  if (!tournament) notFound();

  const stage: Stage = query.stage === "knockout" ? "knockout" : "group";
  const only = typeof query.event === "string" ? query.event : undefined;
  // 조 테이블을 아직 저장하지 않은 대진표도 관리자 화면과 같은 번호를 찍습니다.
  const draw = stored && withGroupTables(stored);
  const events = draw?.events ?? [];
  const chosen = events.filter((event) => !only || event.id === only);

  const now = new Date().toISOString();
  const info: SheetInfo = {
    tournament: `${tournament.title} · ${formatSchedule(tournament, "ko")}`,
    scoreUrl: `${siteUrl()}/tournaments/${id}/bracket`,
    printedAt: `${formatDate(dateOf(now), false)} ${clockTime(now, "ko")}`,
  };

  // 지금 뽑을 수 없는 종목과 그 까닭
  const reasonOf = (event: DrawEvent): string | null => {
    if (stage === "group") return event.groups.length > 0 ? null : "아직 조 편성이 없습니다.";
    if (event.status !== "live") return "대진을 확정하면 본선 기록지를 뽑을 수 있습니다.";
    if (!event.matches.some((m) => m.stage === "knockout" && !isByeMatch(m))) {
      return "본선 없이 조별 리그로 끝나는 종목입니다.";
    }
    return null;
  };
  const printable = chosen.filter((event) => !reasonOf(event));
  const skipped = chosen.filter((event) => reasonOf(event));
  const planned = stage === "group" && printable.some((event) => event.status !== "live");

  const hrefOf = (event: string | undefined, next: Stage) => {
    const search = new URLSearchParams();
    if (event) search.set("event", event);
    if (next === "knockout") search.set("stage", "knockout");
    const text = search.toString();
    return `/admin/tournaments/${id}/draw/print${text ? `?${text}` : ""}`;
  };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 print:hidden">
        <Link
          href={`/admin/tournaments/${id}/draw${only ? `?tab=${encodeURIComponent(only)}` : ""}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeftIcon className="size-4" />
          대진표 관리
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-brand-950">기록지 인쇄</h1>
          <PrintButton disabled={printable.length === 0} />
        </div>
        <p className="mt-1 break-keep text-slate-500">{tournament.title}</p>

        {events.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            <Choice
              label="기록지"
              options={[
                { href: hrefOf(only, "group"), label: "조별 기록지", active: stage === "group" },
                { href: hrefOf(only, "knockout"), label: "본선 기록지", active: stage === "knockout" },
              ]}
            />
            <Choice
              label="종목"
              options={[
                { href: hrefOf(undefined, stage), label: "모든 종목", active: !only },
                ...events.map((event) => ({
                  href: hrefOf(event.id, stage),
                  label: event.name,
                  active: only === event.id,
                })),
              ]}
            />
          </div>
        )}

        <ul className="mt-5 max-w-3xl list-disc space-y-1 pl-5 text-sm leading-relaxed break-keep text-slate-600">
          {stage === "group" ? (
            <li>조마다 한 장씩 나와 조 테이블에 두고 씁니다. 5팀 이상인 조는 경기가 많아 두 장입니다.</li>
          ) : (
            <>
              <li>한 장에 네 경기씩 나옵니다. 점선을 따라 잘라 경기하는 테이블에 가져다 둡니다.</li>
              <li>아직 정해지지 않은 자리는 &apos;A조 1위&apos;처럼 적혀 나옵니다. 예선이 끝난 뒤 뽑으면 팀 이름이 들어갑니다.</li>
            </>
          )}
          {planned && (
            <li>
              대진을 확정하기 전인 종목은 &apos;예정&apos;이 찍히고 테이블 칸이 비어 있습니다. 확정한 뒤 다시 뽑으면 테이블
              번호가 들어갑니다.
            </li>
          )}
          <li>QR 코드는 휴대폰으로 점수를 입력하는 대진표 화면으로 연결됩니다.</li>
          <li>
            인쇄 창에서 용지는 Letter, 배율은 기본(100%)으로 두세요. &apos;머리글과 바닥글&apos;을 끄면 주소와 날짜가 찍히지
            않습니다.
          </li>
        </ul>

        {!draw && (
          <p className="card mt-6 p-6 text-slate-600">아직 대진표가 없습니다. 대진표 관리 화면에서 먼저 만들어 주세요.</p>
        )}
        {skipped.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-xl bg-white px-4 py-3 text-sm break-keep text-slate-500 ring-1 ring-slate-200">
            {skipped.map((event) => (
              <li key={event.id}>
                <strong className="text-slate-700">{event.name}</strong>: {reasonOf(event)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 좁은 화면에서는 종이를 줄이지 않고 옆으로 밀어 봅니다. */}
      <div className="overflow-x-auto px-4 pb-16 print:overflow-visible print:p-0">
        <div className="flex flex-col gap-8 print:block">
          {printable.map((event) =>
            stage === "group" ? (
              <GroupSheets
                key={event.id}
                event={event}
                tablesOf={(group) =>
                  [event.groupTables?.[group], ...(event.extraTables?.[group] ?? [])].filter(
                    (n): n is number => Boolean(n),
                  )
                }
                info={info}
              />
            ) : (
              <KnockoutSheets key={event.id} event={event} info={info} />
            ),
          )}
        </div>
      </div>
    </>
  );
}

function Choice({ label, options }: { label: string; options: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-bold text-slate-500">{label}</span>
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.active ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            option.active
              ? "bg-brand-700 text-white shadow-sm"
              : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
