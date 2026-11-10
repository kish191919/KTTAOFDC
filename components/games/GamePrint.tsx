import { Fragment, type ReactNode } from "react";
import { gamesToWin } from "@/lib/draw/play";
import { matchWinner, sideKey, sideName, summarize, type GameRow, type PublicGame } from "@/lib/games/play";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { GameMatch } from "@/lib/types";
import { QrCode } from "@/components/QrCode";
import { clockTime } from "@/components/draw/labels";

// 친선 경기 인쇄용 종이 (app/[lang]/games/[id]/print).
// - 기록지: 손으로 점수를 적는 빈 종이. 리그전은 순위표(맞대결 칸)와 경기마다 세트 점수 칸, 자유 기록은 빈 경기 칸 한 장입니다.
// - 결과표: 지금까지의 순위 · 맞대결 결과 · 경기 결과입니다.
// 모양과 치수는 대회 기록지(components/draw/ScoreSheets.tsx)와 같습니다. Letter 세로·여백 0.5인치이고,
// 기록지는 높이를 모두 인치로 정해 화면 미리보기와 종이가 같은 모양이 됩니다. 결과표는 길이에 따라 저절로 다음 장으로 넘어갑니다.

/** 종이마다 함께 찍는 내용 */
export type PrintInfo = {
  lang: Locale;
  /** QR 코드로 여는 게임 화면 주소 */
  url: string;
  /** 게임을 만든 날 ("2026년 11월 10일 (화)") */
  date: string;
  /** 이 페이지를 연 때 ("11월 10일 (화) 오후 3:05"). 결과표는 '기준', 기록지는 '출력'으로 붙입니다. */
  time: string;
};

// ───────────────────────── 높이 계산 (인치) ─────────────────────────

/** 한 장에 쓰는 높이. Letter 11인치에서 위아래 여백을 빼고, 브라우저마다 다른 반올림을 생각해 0.1인치를 남깁니다. */
const PAGE = 9.9;
/** 머리 · 순위표 · 경기 기록 · 바닥 사이 */
const GAP = 0.2;
const HEAD = 0.95;
const FOOT = 0.5;
/** "순위표" 같은 제목 줄 */
const TITLE = 0.3;
/** 경기 칸 위의 "1세트 2세트 …" 줄 */
const LABELS = 0.24;
const CROSS_HEAD = 0.26;
const CROSS_ROW = 0.33;
const MATCH_GAP = 0.12;
/** 경기 칸 한 줄(한 쪽)의 높이 후보. 장 수가 같으면 넉넉한 것을 고릅니다. */
const ROWS = [0.5, 0.46, 0.42, 0.4];

/**
 * 리그전 기록지의 경기 칸 높이(row)와 장마다 넣을 경기 수(pages).
 * 첫 장에는 순위표가 함께 들어가므로, 참가자가 아주 많으면 첫 장에는 순위표만 들어갈 수 있습니다(0경기).
 */
export function planRecordSheets(entries: number, matches: number) {
  const cross = TITLE + CROSS_HEAD + entries * CROSS_ROW + GAP;
  const room = (first: boolean) => PAGE - HEAD - FOOT - GAP * 2 - TITLE - LABELS - (first ? cross : 0);
  const split = (row: number) => {
    const pages: number[] = [];
    const per = row * 2 + MATCH_GAP;
    for (let left = matches; left > 0; ) {
      const fit = Math.max(0, Math.floor((room(pages.length === 0) + MATCH_GAP) / per));
      const count = Math.min(left, pages.length === 0 ? fit : Math.max(1, fit));
      pages.push(count);
      left -= count;
    }
    return pages.length > 0 ? pages : [0];
  };
  const fewest = split(ROWS[ROWS.length - 1]).length;
  const row = ROWS.find((r) => split(r).length === fewest) ?? ROWS[ROWS.length - 1];
  return { row, pages: split(row) };
}

/** 세트 칸 너비. 세트가 많으면 이름 칸이 좁아지지 않게 줄입니다. */
const setWidth = (bestOf: number) => (bestOf <= 3 ? 0.9 : bestOf <= 5 ? 0.7 : 0.56);

/** 순위표 칸 너비. 참가자가 많으면 맞대결 칸과 숫자 칸을 줄여 이름 칸을 남깁니다. (종이 안쪽 너비 7.5인치) */
function crossWidths(entries: number) {
  const compact = entries > 10;
  const fixed = compact
    ? { seed: 0.3, count: 0.34, sets: 0.6, rank: 0.42 }
    : { seed: 0.36, count: 0.42, sets: 0.72, rank: 0.52 };
  const used = fixed.seed + fixed.count * 2 + fixed.sets + fixed.rank;
  const cell = Math.min(0.62, Math.max(0.26, (7.5 - used - 1.6) / Math.max(1, entries)));
  return { ...fixed, cell };
}

// ───────────────────────── 공통 ─────────────────────────

/** 용지 한 장. fixed 면 한 장 높이를 채우고(바닥 글이 맨 아래), 아니면 내용 길이만큼입니다. */
function Sheet({ children, fixed = true }: { children: ReactNode; fixed?: boolean }) {
  return (
    <article className="sheet-page mx-auto w-[8.5in] bg-white p-[0.5in] text-slate-900 shadow-md ring-1 ring-slate-200 print:m-0 print:w-auto print:p-0 print:shadow-none print:ring-0">
      <div className={`flex flex-col gap-[0.2in] ${fixed ? "min-h-[9.9in]" : ""}`}>{children}</div>
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

/** 게임 이름 · 방식 · QR 코드 */
function Head({ game, info, line, page = 0, pages = 1 }: { game: PublicGame; info: PrintInfo; line: string; page?: number; pages?: number }) {
  const p = getDictionary(info.lang).games.printing;
  return (
    <header className="flex h-[0.95in] shrink-0 items-end gap-[0.2in] border-b-[2pt] border-navy-900 pb-[0.1in]">
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[8.5pt] text-slate-500">{p.heading(info.date)}</p>
        <div className="mt-[0.04in] flex items-center gap-[0.1in] text-[20pt] font-black text-navy-900">
          <span className="truncate">{game.title}</span>
          {pages > 1 && <span className="shrink-0 text-[9pt] font-medium text-slate-500">{p.page(page + 1, pages)}</span>}
        </div>
        <p className="mt-[0.04in] truncate text-[9.5pt] font-medium">{line}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-[0.02in] text-[6.5pt] leading-tight text-slate-500">
        <QrCode value={info.url} label={p.qr} className="size-[0.66in] shrink-0 text-slate-900" />
        {p.qr}
      </div>
    </header>
  );
}

/** 머리의 한 줄 "리그전 · 5세트 3선승 · 5명 · 경기 10개" */
function headLine(game: PublicGame, lang: Locale, counts = true) {
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const parts = [t.format[game.format], d.bestOf(game.bestOf)];
  if (counts) {
    parts.push(
      game.format === "league" && game.doubles ? t.teams(game.teams.length) : t.people(game.players.length),
      t.matchCount(game.matches.length),
    );
  }
  return parts.join(" · ");
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-[0.3in] items-baseline justify-between gap-[0.2in]">
      <h2 className="shrink-0 text-[10.5pt] font-bold text-navy-900">{title}</h2>
      <p className="truncate text-[7.5pt] text-slate-500">{hint}</p>
    </div>
  );
}

function Foot({ rules, stamp }: { rules: string[]; stamp: string }) {
  return (
    <footer className="mt-auto flex h-[0.5in] shrink-0 justify-between gap-[0.3in] border-t-[0.6pt] border-slate-400 pt-[0.07in] text-[7.3pt] leading-[1.35] text-slate-500 break-inside-avoid">
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
        {stamp}
      </p>
    </footer>
  );
}

/** 이름 "홍길동 · 김철수" (복식은 두 사람) */
function Names({ game, side, className = "" }: { game: PublicGame; side: string[]; className?: string }) {
  return <span className={`min-w-0 leading-[1.15] break-keep ${className}`}>{sideName(game, side)}</span>;
}

// ───────────────────────── 순위표 (맞대결 표) ─────────────────────────

type Cell = { text: string; won: boolean };

/** 가로줄 쪽(row)에서 본 col 과의 경기 결과. 끝나지 않았으면 null */
function crossCell(game: PublicGame, row: string[], col: string[], lang: Locale): Cell | null {
  const p = getDictionary(lang).games.printing;
  const [r, c] = [sideKey(row), sideKey(col)];
  const match = game.matches.find(
    (m) => (sideKey(m.a) === r && sideKey(m.b) === c) || (sideKey(m.a) === c && sideKey(m.b) === r),
  );
  const winner = match && matchWinner(match, game.bestOf);
  if (!match || !winner) return null;
  const mine = sideKey(match.a) === r ? "a" : "b";
  const won = winner === mine;
  if (match.walkover) return { text: won ? p.walkoverWin : p.walkoverLoss, won };
  const [x, y] = match.sets ?? [0, 0];
  return { text: mine === "a" ? `${x}:${y}` : `${y}:${x}`, won };
}

/**
 * 리그전 순위표. 가로줄과 세로줄이 같은 순서(리그 순서)이고, 맞대결 칸에 결과를 적습니다.
 * rows 를 주면(결과표) 맞대결 칸과 승 · 패 · 세트 득실 · 순위를 채우고, 없으면(기록지) 비워 둡니다.
 */
function CrossTable({ game, lang, rows }: { game: PublicGame; lang: Locale; rows?: GameRow[] }) {
  const p = getDictionary(lang).games.printing;
  const d = getDictionary(lang).draw;
  const teams = game.teams;
  const w = crossWidths(teams.length);
  const rowOf = new Map((rows ?? []).map((row) => [sideKey(row.side), row]));
  const many = teams.length > 8;
  const line = "border-[0.6pt] border-slate-400";

  return (
    <table className="w-full table-fixed border-collapse border-[1.5pt] border-slate-900 text-center">
      <colgroup>
        <col style={{ width: `${w.seed}in` }} />
        <col />
        {teams.map((team) => (
          <col key={sideKey(team)} style={{ width: `${w.cell}in` }} />
        ))}
        <col style={{ width: `${w.count}in` }} />
        <col style={{ width: `${w.count}in` }} />
        <col style={{ width: `${w.sets}in` }} />
        <col style={{ width: `${w.rank}in` }} />
      </colgroup>
      <thead>
        <tr className="h-[0.26in] bg-slate-100 text-[7.5pt] font-medium text-slate-500">
          <th className={line} />
          <th className={`${line} px-[0.08in] text-left font-medium`}>{d.entryHeading(game.doubles)}</th>
          {teams.map((team, j) => (
            <th key={sideKey(team)} className={line}>
              <Seed n={j + 1} />
            </th>
          ))}
          <th className={`${line} border-l-[1.5pt] border-l-slate-900 font-medium`}>{p.wins}</th>
          <th className={`${line} font-medium`}>{p.losses}</th>
          <th className={`${line} font-medium`}>{p.setDiff}</th>
          <th className={`${line} font-medium`}>{p.rank}</th>
        </tr>
      </thead>
      <tbody>
        {teams.map((team, i) => {
          const row = rowOf.get(sideKey(team));
          const played = row && row.played > 0;
          return (
            <tr key={sideKey(team)} className="h-[0.33in] break-inside-avoid">
              <td className={line}>
                <Seed n={i + 1} />
              </td>
              <td className={`${line} px-[0.08in] text-left font-bold ${many ? "text-[8pt]" : teams.length >= 5 ? "text-[9pt]" : "text-[10pt]"}`}>
                <Names game={game} side={team} className="line-clamp-2" />
              </td>
              {teams.map((other, j) => {
                if (i === j) return <td key={sideKey(other)} className={`${line} bg-slate-200`} />;
                const cell = rows ? crossCell(game, team, other, lang) : null;
                return (
                  <td
                    key={sideKey(other)}
                    className={`${line} tabular-nums ${many ? "text-[7pt]" : "text-[9pt]"} ${
                      cell?.won ? "font-bold text-navy-900" : "text-slate-500"
                    }`}
                  >
                    {cell?.text}
                  </td>
                );
              })}
              <td className={`${line} border-l-[1.5pt] border-l-slate-900 text-[9pt] tabular-nums`}>{played ? row.wins : ""}</td>
              <td className={`${line} text-[9pt] tabular-nums`}>{played ? row.losses : ""}</td>
              <td className={`${line} text-[9pt] tabular-nums`}>{played ? `${row.setsWon}:${row.setsLost}` : ""}</td>
              <td className={`${line} text-[10pt] font-black text-navy-900 tabular-nums`}>{played ? row.rank : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ───────────────────────── 기록지 ─────────────────────────

/** 경기 칸 위의 이름 줄 "경기 · 선수 · 1세트 … · 승리 세트 수" */
function ColumnLabels({ cols, bestOf, side, lang }: { cols: string; bestOf: number; side: string; lang: Locale }) {
  const p = getDictionary(lang).games.printing;
  return (
    <div
      className="grid h-[0.24in] shrink-0 items-end pb-[0.04in] text-[7.5pt] leading-none text-slate-500"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="text-center">{p.matchNo}</span>
      <span className="pl-[0.1in]">{side}</span>
      {Array.from({ length: bestOf }, (_, i) => (
        <span key={i} className="text-center">
          {p.setNo(i + 1)}
        </span>
      ))}
      <span className="text-center">{p.setsWon}</span>
    </div>
  );
}

/** 경기 하나의 점수 칸. 한 쪽마다 한 줄이고 세트마다 한 칸, 끝에 승리 세트 수 칸입니다. 왼쪽은 두 줄을 합친 경기 번호 칸입니다. */
function ScoreGrid({ cols, height, bestOf, no, label, sides }: { cols: string; height: number; bestOf: number; no: number; label: string; sides: [ReactNode, ReactNode] }) {
  return (
    <div
      className="grid shrink-0 border-[1.3pt] border-slate-900"
      style={{ gridTemplateColumns: cols, gridTemplateRows: "1fr 1fr", height: `${height}in` }}
    >
      <div className="row-span-2 flex flex-col items-center justify-center gap-[0.025in] bg-slate-100">
        <span className="text-[6.5pt] leading-none text-slate-500">{label}</span>
        <span className="text-[14pt] leading-none font-black text-navy-900">{no}</span>
      </div>
      {sides.map((side, i) => {
        const line = i === 0 ? "border-b-[0.6pt] border-b-slate-400" : "";
        return (
          <Fragment key={i}>
            <div className={`flex min-w-0 items-center gap-[0.08in] border-l-[0.6pt] border-l-slate-400 px-[0.1in] text-[10pt] font-bold ${line}`}>
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

const gridCols = (bestOf: number) => `0.7in minmax(0,1fr) repeat(${bestOf}, ${setWidth(bestOf)}in) 0.85in`;

/** 리그전 기록지. 첫 장에 빈 순위표, 그 뒤로 리그 순서대로 경기마다 세트 점수 칸입니다. 경기 번호는 결과표와 같습니다. */
export function LeagueRecordSheets({ game, info }: { game: PublicGame; info: PrintInfo }) {
  const { lang } = info;
  const p = getDictionary(lang).games.printing;
  const d = getDictionary(lang).draw;
  const { row, pages } = planRecordSheets(game.teams.length, game.matches.length);
  const starts = pages.map((_, page) => pages.slice(0, page).reduce((sum, n) => sum + n, 0));
  const seedOf = new Map(game.teams.map((team, i) => [sideKey(team), i + 1]));
  const cols = gridCols(game.bestOf);
  const side = (team: string[]) => (
    <>
      <Seed n={seedOf.get(sideKey(team)) ?? 0} />
      <Names game={game} side={team} />
    </>
  );

  return pages.map((count, page) => (
    <Sheet key={page}>
      <Head game={game} info={info} line={headLine(game, lang)} page={page} pages={pages.length} />
      {page === 0 && (
        <section className="shrink-0">
          <SectionTitle title={p.standingsTitle} hint={p.crossRecordHint(gamesToWin(game.bestOf))} />
          <CrossTable game={game} lang={lang} />
        </section>
      )}
      {count > 0 && (
        <section className="shrink-0">
          <SectionTitle title={p.matchesTitle} hint={p.matchesHint} />
          <ColumnLabels cols={cols} bestOf={game.bestOf} side={d.entryHeading(game.doubles)} lang={lang} />
          <ol className="flex flex-col gap-[0.12in]">
            {game.matches.slice(starts[page], starts[page] + count).map((match, k) => (
              <li key={match.id}>
                <ScoreGrid
                  cols={cols}
                  height={row * 2}
                  bestOf={game.bestOf}
                  no={starts[page] + k + 1}
                  label={p.matchNo}
                  sides={[side(match.a), side(match.b)]}
                />
              </li>
            ))}
          </ol>
        </section>
      )}
      <Foot rules={[p.pointsRule, p.walkoverRule, d.rankingRule]} stamp={p.printed(info.time)} />
    </Sheet>
  ));
}

/** 자유 기록 기록지. 이름 칸이 빈 경기 칸으로 한 장을 채웁니다. 모자라면 여러 장 뽑습니다. */
export function FreeRecordSheet({ game, info }: { game: PublicGame; info: PrintInfo }) {
  const { lang } = info;
  const p = getDictionary(lang).games.printing;
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const row = 0.4;
  const room = PAGE - HEAD - FOOT - GAP * 2 - TITLE - LABELS;
  const count = Math.floor((room + MATCH_GAP) / (row * 2 + MATCH_GAP));
  const cols = gridCols(game.bestOf);

  return (
    <Sheet>
      <Head game={game} info={info} line={headLine(game, lang, false)} />
      <section className="shrink-0">
        <SectionTitle title={p.matchesTitle} hint={p.freeMatchesHint} />
        <ColumnLabels cols={cols} bestOf={game.bestOf} side={d.entryHeading(false)} lang={lang} />
        <ol className="flex flex-col gap-[0.12in]">
          {Array.from({ length: count }, (_, k) => (
            <li key={k}>
              <ScoreGrid cols={cols} height={row * 2} bestOf={game.bestOf} no={k + 1} label={p.matchNo} sides={[null, null]} />
            </li>
          ))}
        </ol>
      </section>
      <Foot rules={[p.pointsRule, t.freeRankingRule]} stamp={p.printed(info.time)} />
    </Sheet>
  );
}

// ───────────────────────── 결과표 ─────────────────────────

/** 경기 한 줄 "3  홍길동  3 : 1  김철수" 와 세트별 점수 */
function ResultLine({ game, match, no, label, lang }: { game: PublicGame; match: GameMatch; no: number; label?: string; lang: Locale }) {
  const p = getDictionary(lang).games.printing;
  const d = getDictionary(lang).draw;
  const winner = matchWinner(match, game.bestOf);
  const started = Boolean(match.sets && match.sets[0] + match.sets[1] > 0);
  const score = (side: "a" | "b") =>
    match.walkover ? (match.walkover === side ? "W" : "–") : (match.sets?.[side === "a" ? 0 : 1] ?? "");
  const style = (side: "a" | "b") => (winner === side ? "font-bold text-navy-900" : winner ? "text-slate-500" : "");

  return (
    <li className="grid grid-cols-[0.32in_minmax(0,1fr)_0.62in_minmax(0,1fr)] items-baseline gap-x-[0.08in] border-b-[0.5pt] border-slate-200 py-[0.045in] text-[9pt] break-inside-avoid">
      <span className="text-right text-[7.5pt] text-slate-500 tabular-nums">{no}</span>
      <Names game={game} side={match.a} className={`text-right ${style("a")}`} />
      <span className="text-center font-bold tabular-nums">
        {winner || started ? (
          `${score("a")} : ${score("b")}`
        ) : (
          <span className="text-[7.5pt] font-normal text-slate-400">{d.versus}</span>
        )}
      </span>
      <Names game={game} side={match.b} className={style("b")} />
      {(label || (match.points && match.points.length > 0) || (!winner && started)) && (
        <span className="col-span-3 col-start-2 text-center text-[7pt] text-slate-500 tabular-nums">
          {[
            label,
            match.points?.map(([a, b]) => `${a}-${b}`).join(", "),
            !winner && started ? p.inPlay : undefined,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      )}
    </li>
  );
}

/** 자유 기록 순위표: 한 사람씩 경기 수 · 승 · 패 · 세트 득실 */
function FreeStandings({ game, rows, lang }: { game: PublicGame; rows: GameRow[]; lang: Locale }) {
  const p = getDictionary(lang).games.printing;
  const d = getDictionary(lang).draw;
  const line = "border-[0.6pt] border-slate-400";
  return (
    <table className="w-full table-fixed border-collapse border-[1.5pt] border-slate-900 text-center text-[9.5pt]">
      <colgroup>
        <col style={{ width: "0.5in" }} />
        <col />
        <col style={{ width: "0.6in" }} />
        <col style={{ width: "0.6in" }} />
        <col style={{ width: "0.6in" }} />
        <col style={{ width: "0.9in" }} />
      </colgroup>
      <thead>
        <tr className="h-[0.26in] bg-slate-100 text-[7.5pt] text-slate-500">
          <th className={`${line} font-medium`}>{p.rank}</th>
          <th className={`${line} px-[0.08in] text-left font-medium`}>{d.entryHeading(false)}</th>
          <th className={`${line} font-medium`}>{p.played}</th>
          <th className={`${line} font-medium`}>{p.wins}</th>
          <th className={`${line} font-medium`}>{p.losses}</th>
          <th className={`${line} font-medium`}>{p.setDiff}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={sideKey(row.side)} className="h-[0.3in] break-inside-avoid">
            <td className={`${line} font-black text-navy-900 tabular-nums`}>{row.played > 0 ? row.rank : "–"}</td>
            <td className={`${line} px-[0.08in] text-left font-bold`}>
              <Names game={game} side={row.side} />
            </td>
            <td className={`${line} tabular-nums`}>{row.played}</td>
            <td className={`${line} tabular-nums`}>{row.wins}</td>
            <td className={`${line} tabular-nums`}>{row.losses}</td>
            <td className={`${line} tabular-nums`}>
              {row.setsWon}:{row.setsLost}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * 결과표 한 부. 리그전은 1·2·3위(모두 끝났을 때), 채운 순위표, 리그 순서대로의 경기 결과이고,
 * 자유 기록은 순위표와 적은 순서대로의 경기 결과입니다. 길면 다음 장으로 넘어갑니다.
 */
export function ResultsSheet({ game, info }: { game: PublicGame; info: PrintInfo }) {
  const { lang } = info;
  const p = getDictionary(lang).games.printing;
  const t = getDictionary(lang).games;
  const d = getDictionary(lang).draw;
  const league = game.format === "league";
  const summary = summarize(game);
  const podium = [d.podium.champion, d.podium.second, d.podium.third];
  // 경기가 많으면 두 단으로 나눠 장 수를 줄입니다.
  const twoColumns = game.matches.length > 16;

  return (
    <Sheet fixed={false}>
      <Head game={game} info={info} line={headLine(game, lang)} />

      {summary.podium && (
        <div className="grid grid-cols-3 gap-[0.1in] break-inside-avoid">
          {summary.podium.map((row, i) => (
            <div key={sideKey(row.side)} className="rounded-[0.05in] border-[1pt] border-slate-300 px-[0.12in] py-[0.07in]">
              <p className={`text-[7.5pt] font-bold ${i === 0 ? "text-accent-700" : "text-slate-500"}`}>{podium[i]}</p>
              <p className={`mt-[0.02in] break-keep ${i === 0 ? "text-[12pt] font-black text-navy-900" : "text-[10.5pt] font-bold"}`}>
                {sideName(game, row.side)}
              </p>
            </div>
          ))}
        </div>
      )}

      <section>
        <SectionTitle
          title={p.standingsTitle}
          hint={league ? p.crossResultsHint : t.people(game.players.length)}
        />
        {league ? (
          <CrossTable game={game} lang={lang} rows={summary.rows} />
        ) : summary.rows.length > 0 ? (
          <FreeStandings game={game} rows={summary.rows} lang={lang} />
        ) : (
          <p className="text-[9pt] text-slate-500">{p.noMatches}</p>
        )}
      </section>

      {game.matches.length > 0 && (
        <section>
          <SectionTitle
            title={p.resultsTitle}
            hint={league ? t.progress(summary.done, summary.total) : t.matchCount(summary.total)}
          />
          <ol className={`border-t-[1.3pt] border-slate-900 ${twoColumns ? "columns-2 gap-x-[0.3in]" : ""}`}>
            {game.matches.map((match, i) => (
              <ResultLine
                key={match.id}
                game={game}
                match={match}
                no={i + 1}
                label={!league && match.createdAt ? clockTime(match.createdAt, lang) : undefined}
                lang={lang}
              />
            ))}
          </ol>
        </section>
      )}

      <Foot rules={[league ? d.rankingRule : t.freeRankingRule]} stamp={p.asOf(info.time)} />
    </Sheet>
  );
}
