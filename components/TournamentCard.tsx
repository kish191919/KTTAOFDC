import Link from "next/link";
import type { Tournament } from "@/lib/types";
import { formatDateRange, statusLabel, statusOf, yearOf } from "@/lib/dates";
import { ArrowRightIcon, CalendarIcon, MapPinIcon, PaddleMark } from "@/components/icons";

export function StatusBadge({
  tournament,
  now,
  className = "",
}: {
  tournament: Pick<Tournament, "startDate" | "endDate">;
  now: string;
  className?: string;
}) {
  const status = statusOf(tournament, now);
  const tone =
    status === "past"
      ? "bg-slate-800/80 text-white"
      : status === "ongoing"
        ? "bg-accent-600 text-white"
        : "bg-brand-700 text-white";
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${tone} ${className}`}
    >
      {statusLabel(tournament, now)}
    </span>
  );
}

/** 포스터가 없는 대회에 보여 주는 기본 그림 */
export function PosterFallback({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-linear-to-br from-brand-700 via-brand-800 to-navy-950 ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute -top-16 -right-16 size-44 rounded-full border-[20px] border-accent-500"
      />
      <PaddleMark light className="relative size-20" />
    </div>
  );
}

export function TournamentCard({
  tournament,
  now,
}: {
  tournament: Tournament;
  now: string;
}) {
  const poster = tournament.images[0];
  const place = tournament.venue || tournament.address;
  const past = statusOf(tournament, now) === "past";

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group card flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-50">
        {poster ? (
          // 관리자가 올린 포스터는 최적화 서버를 거치지 않고 그대로 보여 줍니다.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <PosterFallback className="h-full w-full" />
        )}
        <StatusBadge
          tournament={tournament}
          now={now}
          className="absolute top-3 left-3 shadow-sm"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-600">
          <CalendarIcon className="size-4" />
          {formatDateRange(tournament, past && yearOf(tournament.startDate) !== yearOf(now))}
        </p>
        <h3 className="mt-2 line-clamp-2 text-lg leading-snug font-bold break-keep text-slate-900 transition-colors group-hover:text-brand-700">
          {tournament.title}
        </h3>
        {place && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-1">{place}</span>
          </p>
        )}
        <div className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-brand-700">
          세부 정보
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
