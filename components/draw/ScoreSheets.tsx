import { Fragment, type ReactNode } from "react";
import { eventContext, matchBestOf, type EventContext } from "@/lib/draw/play";
import { buildMatches } from "@/lib/draw/setup";
import { groupLetter, isByeMatch } from "@/lib/draw/view";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { DrawEntry, DrawEvent, DrawMatch, DrawSlot } from "@/lib/types";
import { QrCode } from "@/components/QrCode";
import { matchLabel, slotLabel } from "./labels";

// 인쇄용 경기 기록지 (app/[lang]/admin/tournaments/[id]/draw/print).
// 조별 기록지는 조마다 한 장(경기가 많은 5팀 이상 조는 두 장), 본선 기록지는 한 장에 네 경기입니다.
// 용지는 Letter 세로·여백 0.5인치이고, 높이를 모두 인치로 정해 화면 미리보기와 종이가 같은 모양이 됩니다.

const t = getDictionary("ko").draw;

/** 기록지마다 함께 찍는 내용 */
export type SheetInfo = {
  /** "대회 이름 · 2026년 10월 24일 (토) 오후 1:00" */
  tournament: string;
  /** QR 코드로 여는 점수 입력 화면 주소 */
  scoreUrl: string;
  /** 뽑은 때 "10월 24일 (토) 오후 12:40" */
  printedAt: string;
};

// ───────────────────────── 높이 계산 (인치) ─────────────────────────

/** 한 장에 쓰는 높이. Letter 11인치에서 위아래 여백을 빼고, 브라우저마다 다른 반올림을 생각해 0.1인치를 남깁니다. */
const PAGE = 9.9;
/** 머리 · 순위표 · 경기 기록 · 바닥 사이 */
const GAP = 0.2;
const HEAD = 0.95;
const FOOT = 0.5;
/** "조 순위표" 같은 제목 줄 */
const TITLE = 0.3;
/** 경기 칸 위의 "1세트 2세트 …" 줄 */
const LABELS = 0.24;
const STANDING_HEAD = 0.26;
const STANDING_ROW = 0.33;
const MATCH_GAP = 0.12;
/** 경기 칸 한 줄(한 팀)의 높이 후보. 넉넉한 것부터 고릅니다. */
const ROWS = [0.62, 0.56, 0.5, 0.46, 0.42, 0.4, 0.38, 0.36, 0.34];
/** 마지막 장에 이만큼 남으면 메모 칸을 둡니다. */
const MEMO = 0.6;

/**
 * 조 기록지의 경기 칸 높이(row)와 장마다 넣을 경기 수(pages).
 * 한 장에 다 들어가면 한 장(4팀 조까지), 아니면 두 장에 들어가는 가장 넉넉한 칸을 고릅니다.
 * 첫 장에는 순위표가 함께 들어갑니다.
 */
export function planGroupSheet(teams: number, matches: number) {
  const standings = TITLE + STANDING_HEAD + teams * STANDING_ROW;
  const room = (first: boolean) => PAGE - HEAD - FOOT - GAP * 2 - TITLE - LABELS - (first ? standings + GAP : 0);
  const split = (row: number) => {
    const pages: number[] = [];
    for (let left = matches; left > 0; ) {
      const fit = Math.floor((room(pages.length === 0) + MATCH_GAP) / (row * 2 + MATCH_GAP));
      const count = Math.max(1, Math.min(left, fit));
      pages.push(count);
      left -= count;
    }
    return pages.length > 0 ? pages : [0];
  };
  const row =
    ROWS.find((r) => r >= 0.38 && split(r).length === 1) ??
    ROWS.find((r) => split(r).length <= 2) ??
    ROWS[ROWS.length - 1];
  const pages = split(row);
  const last = pages.length - 1;
  const used = pages[last] * row * 2 + Math.max(0, pages[last] - 1) * MATCH_GAP;
  return { row, pages, memo: room(last === 0) - used - GAP >= MEMO };
}

/** 세트 칸 너비. 세트가 많으면 이름 칸이 좁아지지 않게 줄입니다. */
const setWidth = (bestOf: number) => (bestOf <= 3 ? 0.9 : bestOf <= 5 ? 0.7 : 0.56);

const SET_COUNT_LABEL = "승리 세트 수";

// ───────────────────────── 공통 ─────────────────────────

/** 용지 한 장. 화면에서는 종이처럼 보여 주고, 인쇄할 때는 한 장에 하나씩 나옵니다. (나누는 규칙은 인쇄 페이지에) */
function Page({ children, className = "gap-[0.2in]" }: { children: ReactNode; className?: string }) {
  return (
    <article className="sheet-page mx-auto w-[8.5in] bg-white p-[0.5in] text-slate-900 shadow-md ring-1 ring-slate-200 print:m-0 print:w-auto print:p-0 print:shadow-none print:ring-0">
      <div className={`flex min-h-[9.9in] flex-col ${className}`}>{children}</div>
    </article>
  );
}

function Seed({ n }: { n: number }) {
  return (
    <span className="inline-flex size-[0.21in] shrink-0 items-center justify-center rounded-full border-[1.2pt] border-navy-900 text-[8pt] leading-none font-bold text-navy-900">
      {n}
    </span>
  );
}

/** 팀 이름 "김수미 / 이도임". 경기 중에 불참 처리한 팀은 '기권'을 붙입니다. */
function TeamNames({ entry }: { entry?: DrawEntry }) {
  if (!entry) return <span className="text-slate-400">?</span>;
  return (
    <span className="min-w-0 leading-[1.15]">
      {entry.players.map((name, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="font-normal text-slate-400"> / </span>}
          <span className="whitespace-nowrap">{name}</span>
        </Fragment>
      ))}
      {entry.absent === "forfeit" && (
        <span className="ml-[0.06in] text-[7pt] font-bold whitespace-nowrap text-accent-700">기권</span>
      )}
    </span>
  );
}

/** 테이블 번호 칸. 아직 정하지 않았으면 비워 두어 손으로 적습니다. */
function TableBox({ tables, className = "h-[0.66in]" }: { tables: number[]; className?: string }) {
  return (
    <div
      className={`flex min-w-[0.95in] shrink-0 flex-col items-center justify-center rounded-[0.06in] border-[1.3pt] border-navy-900 px-[0.12in] ${className}`}
    >
      <span className="text-[7.5pt] leading-tight text-slate-500">테이블</span>
      <span className="min-h-[0.3in] text-[20pt] leading-none font-black text-navy-900 tabular-nums">
        {tables.join(" · ")}
      </span>
    </div>
  );
}

function ScoreQr({ url, className }: { url: string; className: string }) {
  return <QrCode value={url} label="점수 입력 화면 QR 코드" className={`shrink-0 text-slate-900 ${className}`} />;
}

/** 운영진이 점수를 사이트에 옮겨 적었는지 표시하는 칸 */
function AppCheck() {
  return (
    <span className="flex items-center gap-[0.03in] text-[6.5pt] leading-none whitespace-nowrap text-slate-500">
      <span className="size-[0.09in] border-[0.6pt] border-slate-500" />앱 입력
    </span>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-[0.3in] items-baseline justify-between gap-[0.2in]">
      <h2 className="shrink-0 text-[10.5pt] font-bold text-navy-900">{title}</h2>
      <p className="truncate text-[7.5pt] text-slate-500">{hint}</p>
    </div>
  );
}

/** 경기 칸 위의 이름 줄 "경기 · 팀 · 1세트 … · 승리 세트 수" */
function ColumnLabels({ cols, bestOf, side, numbered }: { cols: string; bestOf: number; side: string; numbered: boolean }) {
  return (
    <div
      className="grid h-[0.24in] shrink-0 items-end pb-[0.04in] text-[7.5pt] leading-none text-slate-500"
      style={{ gridTemplateColumns: cols }}
    >
      {numbered && <span className="text-center">경기</span>}
      <span className="pl-[0.1in]">{side}</span>
      {Array.from({ length: bestOf }, (_, i) => (
        <span key={i} className="text-center">
          {i + 1}세트
        </span>
      ))}
      <span className="text-center">{SET_COUNT_LABEL}</span>
    </div>
  );
}

/**
 * 경기 하나의 점수 칸. 팀마다 한 줄이고 세트마다 한 칸, 끝에 승리 세트 수 칸입니다.
 * lead 가 있으면 왼쪽에 두 줄을 합친 칸(경기 번호)을 둡니다.
 */
function ScoreGrid({
  cols,
  height,
  bestOf,
  lead,
  sides,
}: {
  cols: string;
  height: number;
  bestOf: number;
  lead?: ReactNode;
  sides: [ReactNode, ReactNode];
}) {
  return (
    <div
      className="grid shrink-0 border-[1.3pt] border-slate-900"
      style={{ gridTemplateColumns: cols, gridTemplateRows: "1fr 1fr", height: `${height}in` }}
    >
      {lead && (
        <div className="row-span-2 flex flex-col items-center justify-center gap-[0.025in] bg-slate-100">{lead}</div>
      )}
      {sides.map((side, i) => {
        const line = i === 0 ? "border-b-[0.6pt] border-b-slate-400" : "";
        return (
          <Fragment key={i}>
            <div
              className={`flex min-w-0 items-center gap-[0.08in] px-[0.1in] text-[10pt] font-bold ${
                lead ? "border-l-[0.6pt] border-l-slate-400" : ""
              } ${line}`}
            >
              {side}
            </div>
            {Array.from({ length: bestOf }, (_, s) => (
              <div key={s} className={`border-l-[0.6pt] border-l-slate-400 ${line}`} />
            ))}
            <div className={`border-l-[1.3pt] border-l-slate-900 ${line}`} />
          </Fragment>
        );
      })}
    </div>
  );
}

function SheetFoot({ info, rules }: { info: SheetInfo; rules: string[] }) {
  return (
    <footer className="mt-auto flex h-[0.5in] shrink-0 justify-between gap-[0.3in] border-t-[0.6pt] border-slate-400 pt-[0.07in] text-[7.3pt] leading-[1.35] text-slate-500">
      <ul className="min-w-0">
        {rules.map((rule) => (
          <li key={rule} className="truncate">
            {rule}
          </li>
        ))}
      </ul>
      <p className="shrink-0 text-right">
        <b className="text-navy-900">KTTA of DC</b>
        <br />
        {info.printedAt} 출력
      </p>
    </footer>
  );
}

// ───────────────────────── 조별 기록지 ─────────────────────────

const GROUP_RULES = [
  "세트마다 두 팀의 점수를 적습니다. 11점을 먼저 내면 그 세트를 이기고, 10:10 뒤에는 2점을 앞서야 합니다.",
  `기권한 경기는 ${SET_COUNT_LABEL} 칸에 '기권'이라고 적습니다.`,
  "순위: 승점(승 2 · 패 1 · 기권 0) → 같으면 그 팀끼리의 경기 → 세트 득실 → 점수 득실",
];

const entryOf = (slot: DrawSlot) => ("entry" in slot ? slot.entry : "");

/**
 * 한 종목의 조별 기록지. 조마다 머리, 조 순위표(팀끼리 맞붙는 표), 경기 순서대로의 점수 칸이 들어갑니다.
 * 대진을 확정하기 전(조 편성 단계)에 뽑으면 '예정'을 찍고 테이블 칸을 비워 둡니다.
 */
export function GroupSheets({
  event,
  tablesOf,
  info,
}: {
  event: DrawEvent;
  /** 조가 쓰는 테이블. 조 테이블이 앞이고, 함께 쓰는 테이블이 뒤에 옵니다. */
  tablesOf: (group: number) => number[];
  info: SheetInfo;
}) {
  const planned = event.status !== "live";
  // 확정 전에는 경기가 아직 없어서, 확정할 때와 같은 방법으로 조 경기를 만들어 봅니다.
  const matches = (planned ? buildMatches(event) : event.matches).filter((m) => m.stage === "group");
  const entries = new Map(event.entries.map((e) => [e.id, e]));
  const unit = event.doubles ? "팀" : "명";
  const side = event.doubles ? "팀" : "선수";
  const cols = `0.7in minmax(0,1fr) repeat(${event.bestOf}, ${setWidth(event.bestOf)}in) 0.85in`;

  return event.groups.flatMap((members, group) => {
    const games = matches.filter((m) => m.group === group);
    const { row, pages, memo } = planGroupSheet(members.length, games.length);
    const tables = planned ? [] : tablesOf(group);
    const vsWidth = members.length <= 4 ? "0.62in" : members.length <= 6 ? "0.52in" : "0.44in";
    // 3팀 조는 경기가 하나씩 이어지고, 4팀 이상은 같은 차례의 경기를 함께 칠 수 있습니다.
    const rounds = members.length >= 4;
    const hint = rounds
      ? "같은 차례의 경기는 동시에 칠 수 있습니다 · 순서는 바뀌어도 괜찮습니다"
      : "위에서부터 차례로 칩니다 · 순서는 바뀌어도 괜찮습니다";
    const starts = pages.map((_, page) => pages.slice(0, page).reduce((sum, n) => sum + n, 0));

    return pages.map((count, page) => (
      <Page key={`${event.id}-${group}-${page}`}>
        <header className="flex h-[0.95in] shrink-0 items-end gap-[0.2in] border-b-[2pt] border-navy-900 pb-[0.1in]">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[8.5pt] text-slate-500">{info.tournament}</p>
            <div className="mt-[0.04in] flex items-center gap-[0.1in] text-[20pt] font-black text-navy-900">
              <span className="truncate">{event.name}</span>
              <span className="shrink-0 rounded-[0.05in] bg-navy-900 px-[0.09in] text-[16pt] text-white">
                {groupLetter(group)}조
              </span>
              {planned && (
                <span className="shrink-0 rounded-[0.05in] border-[1.5pt] border-accent-600 px-[0.07in] text-[12pt] text-accent-600">
                  예정
                </span>
              )}
              {pages.length > 1 && (
                <span className="shrink-0 text-[9pt] font-medium text-slate-500">
                  {page + 1}/{pages.length}쪽
                </span>
              )}
            </div>
            <p className="mt-[0.04in] truncate text-[9.5pt] font-medium">
              {t.bestOf(event.bestOf)} · {members.length}
              {unit} · {games.length}경기
              {planned && (
                <span className="ml-[0.12in] text-[8pt] font-bold text-accent-700">
                  대진 확정 전 편성입니다. 오지 않은 {side}은 줄을 그어 주세요.
                </span>
              )}
            </p>
          </div>
          <TableBox tables={tables} />
          <div className="flex shrink-0 flex-col items-center gap-[0.02in] text-[6.5pt] leading-tight text-slate-500">
            <ScoreQr url={info.scoreUrl} className="size-[0.66in]" />
            점수 입력
          </div>
        </header>

        {page === 0 && (
          <section className="shrink-0">
            <SectionTitle title="조 순위표" hint={`가로줄 ${side}이 이긴 세트 수를 먼저 적습니다 (예: 2:1)`} />
            <table className="w-full table-fixed border-collapse border-[1.3pt] border-slate-900 text-center">
              <colgroup>
                <col style={{ width: "0.36in" }} />
                <col />
                {members.map((id) => (
                  <col key={id} style={{ width: vsWidth }} />
                ))}
                <col style={{ width: "0.42in" }} />
                <col style={{ width: "0.42in" }} />
                <col style={{ width: "0.72in" }} />
                <col style={{ width: "0.52in" }} />
              </colgroup>
              <thead>
                <tr className="h-[0.26in] bg-slate-100 text-[7.5pt] font-medium text-slate-500">
                  <th className="border-[0.6pt] border-slate-400" />
                  <th className="border-[0.6pt] border-slate-400 px-[0.08in] text-left font-medium">{side}</th>
                  {members.map((id, j) => (
                    <th key={id} className="border-[0.6pt] border-slate-400">
                      <Seed n={j + 1} />
                    </th>
                  ))}
                  <th className="border-[0.6pt] border-l-[1.3pt] border-slate-400 border-l-slate-900 font-medium">승</th>
                  <th className="border-[0.6pt] border-slate-400 font-medium">패</th>
                  <th className="border-[0.6pt] border-slate-400 font-medium">세트 득실</th>
                  <th className="border-[0.6pt] border-slate-400 font-medium">순위</th>
                </tr>
              </thead>
              <tbody>
                {members.map((id, i) => (
                  <tr key={id} className="h-[0.33in]">
                    <td className="border-[0.6pt] border-slate-400">
                      <Seed n={i + 1} />
                    </td>
                    <td
                      className={`border-[0.6pt] border-slate-400 px-[0.08in] text-left font-bold ${
                        members.length >= 5 ? "text-[9pt]" : "text-[10pt]"
                      }`}
                    >
                      <TeamNames entry={entries.get(id)} />
                    </td>
                    {members.map((other, j) => (
                      <td key={other} className={`border-[0.6pt] border-slate-400 ${i === j ? "bg-slate-200" : ""}`} />
                    ))}
                    <td className="border-[0.6pt] border-l-[1.3pt] border-slate-400 border-l-slate-900" />
                    <td className="border-[0.6pt] border-slate-400" />
                    <td className="border-[0.6pt] border-slate-400" />
                    <td className="border-[0.6pt] border-slate-400" />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="shrink-0">
          <SectionTitle title="경기 기록" hint={hint} />
          <ColumnLabels cols={cols} bestOf={event.bestOf} side={side} numbered />
          <ol className="flex flex-col gap-[0.12in]">
            {games.slice(starts[page], starts[page] + count).map((match, index) => {
              const [a, b] = [entryOf(match.a), entryOf(match.b)];
              return (
                <li key={match.id}>
                  <ScoreGrid
                    cols={cols}
                    height={row * 2}
                    bestOf={event.bestOf}
                    lead={
                      <>
                        <span className="text-[6.5pt] leading-none text-slate-500">경기</span>
                        <span className="text-[14pt] leading-none font-black text-navy-900">
                          {starts[page] + index + 1}
                        </span>
                        {rounds && (
                          <span className="rounded-full border-[0.6pt] border-navy-900 px-[0.05in] text-[6.5pt] leading-tight font-bold text-navy-900">
                            {match.round + 1}차례
                          </span>
                        )}
                        <AppCheck />
                      </>
                    }
                    sides={[
                      <>
                        <Seed n={members.indexOf(a) + 1} />
                        <TeamNames entry={entries.get(a)} />
                      </>,
                      <>
                        <Seed n={members.indexOf(b) + 1} />
                        <TeamNames entry={entries.get(b)} />
                      </>,
                    ]}
                  />
                </li>
              );
            })}
          </ol>
        </section>

        {memo && page === pages.length - 1 && (
          <div className="flex-1 rounded-[0.05in] border-[0.75pt] border-dashed border-slate-400 px-[0.12in] py-[0.07in] text-[7.5pt] text-slate-500">
            메모 · 특이사항
          </div>
        )}

        <SheetFoot info={info} rules={GROUP_RULES} />
      </Page>
    ));
  });
}

// ───────────────────────── 본선 기록지 ─────────────────────────

/** 본선 기록지 한 장에 넣는 경기 수. 점선을 따라 잘라 경기하는 테이블에 가져다 둡니다. */
const SLIPS_PER_PAGE = 4;

/** 본선 경기 한 칸. 아직 정해지지 않은 자리는 'A조 1위'처럼 작게 적고, 이름 쓸 곳을 비워 둡니다. */
function KnockoutSlip({
  event,
  match,
  context,
  info,
}: {
  event: DrawEvent;
  match: DrawMatch;
  context: EventContext;
  info: SheetInfo;
}) {
  const bestOf = matchBestOf(event, match);
  const cols = `minmax(0,1fr) repeat(${bestOf}, ${setWidth(bestOf)}in) 0.85in`;
  const participants = context.participants(match);
  const side = (index: 0 | 1) => {
    const resolved = participants[index];
    if ("entry" in resolved) return <TeamNames entry={context.entryById.get(resolved.entry)} />;
    return (
      <span className="self-start pt-[0.05in] text-[7.5pt] font-medium text-slate-500">
        {slotLabel(index === 0 ? match.a : match.b, context, t)}
      </span>
    );
  };

  return (
    <div className="flex h-[2.3in] shrink-0 flex-col">
      {/* 글줄이 칸보다 높으면 위로 넘쳐 앞 장 아래에 찍히므로 줄 간격을 좁게 둡니다. */}
      <header className="flex h-[0.74in] shrink-0 items-end gap-[0.2in] border-b-[1.5pt] border-navy-900 pb-[0.06in]">
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[8pt] text-slate-500">{info.tournament}</p>
          <div className="mt-[0.03in] flex items-center gap-[0.1in] text-[16pt] font-black text-navy-900">
            <span className="truncate">{event.name}</span>
            <span className="shrink-0 rounded-[0.05in] bg-navy-900 px-[0.08in] text-[13pt] text-white">
              {matchLabel(event, match, t)}
            </span>
          </div>
          <p className="mt-[0.02in] text-[9pt] font-medium">본선 · {t.bestOf(bestOf)}</p>
        </div>
        <TableBox tables={match.table ? [match.table] : []} className="h-[0.6in]" />
        <ScoreQr url={info.scoreUrl} className="size-[0.6in]" />
      </header>
      <div className="mt-[0.08in]">
        <ColumnLabels cols={cols} bestOf={bestOf} side={event.doubles ? "팀" : "선수"} numbered={false} />
        <ScoreGrid cols={cols} height={1} bestOf={bestOf} sides={[side(0), side(1)]} />
      </div>
      <div className="mt-[0.06in] flex items-center justify-between gap-[0.2in] text-[6.5pt] leading-none text-slate-500">
        <AppCheck />
        <span className="truncate">
          기권한 경기는 {SET_COUNT_LABEL} 칸에 &apos;기권&apos;이라고 적습니다 · KTTA of DC · {info.printedAt} 출력
        </span>
      </div>
    </div>
  );
}

/** 한 종목의 본선 기록지. 부전승 경기는 빼고, 라운드 순서대로 한 장에 네 경기씩 넣습니다. */
export function KnockoutSheets({ event, info }: { event: DrawEvent; info: SheetInfo }) {
  const context = eventContext(event);
  const matches = event.matches
    .filter((m) => m.stage === "knockout" && !isByeMatch(m))
    .sort((x, y) => x.round - y.round || (x.position ?? 0) - (y.position ?? 0));
  const pages = Array.from({ length: Math.ceil(matches.length / SLIPS_PER_PAGE) }, (_, page) =>
    matches.slice(page * SLIPS_PER_PAGE, (page + 1) * SLIPS_PER_PAGE),
  );

  return pages.map((list, page) => (
    <Page key={`${event.id}-k${page}`} className="gap-0">
      {list.map((match, index) => (
        <Fragment key={match.id}>
          {/* 자르는 선 */}
          {index > 0 && (
            <div aria-hidden className="flex h-[0.2in] shrink-0 items-center">
              <div className="w-full border-t-[0.75pt] border-dashed border-slate-400" />
            </div>
          )}
          <KnockoutSlip event={event} match={match} context={context} info={info} />
        </Fragment>
      ))}
    </Page>
  ));
}
