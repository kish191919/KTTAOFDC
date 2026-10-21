import Link from "next/link";
import { dateOf, formatDate } from "@/lib/dates";
import { sideName, summarize, type GameRow, type PublicGame } from "@/lib/games/play";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ChevronRightIcon } from "@/components/icons";

/**
 * 친선 경기 목록의 한 줄: 방식·날짜·이름과 진행 상황(리그전 우승 또는 지금 1위).
 * record 를 주면 이름으로 찾은 사람의 그 게임 성적을 함께 적습니다.
 */
export function GameCard({
  lang,
  game,
  open,
  record,
}: {
  lang: Locale;
  game: PublicGame;
  /** 아직 기록할 수 있는 게임인지 (마감 표시) */
  open: boolean;
  record?: GameRow | null;
}) {
  const t = getDictionary(lang).games;
  const summary = summarize(game);
  const top = summary.rows[0];
  const league = game.format === "league";
  const result = summary.podium
    ? t.champion(sideName(game, summary.podium[0].side))
    : top && top.played > 0
      ? t.leader(sideName(game, top.side))
      : "";

  return (
    <li>
      <Link
        href={localePath(lang, `/games/${game.id}`)}
        className="card flex items-center gap-3 p-4 transition hover:border-brand-200 hover:shadow-md sm:p-5"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand-700">{t.format[game.format]}</span>
            {formatDate(dateOf(game.createdAt), true, lang)}
            {!open && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-500">{t.closed}</span>}
          </p>
          <p className="mt-1.5 truncate font-bold text-slate-900">{game.title}</p>
          <p className="mt-1 text-sm break-keep text-slate-500">
            {[
              league && game.doubles ? t.teams(game.teams.length) : t.people(game.players.length),
              league ? t.progress(summary.done, summary.total) : t.matchCount(summary.total),
              result,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {record && record.played > 0 && (
            <p className="mt-1.5 text-sm font-bold text-brand-700">
              {t.personGameRecord(record.wins, record.losses, record.rank)}
            </p>
          )}
        </div>
        <ChevronRightIcon className="size-5 shrink-0 text-slate-300" />
      </Link>
    </li>
  );
}
