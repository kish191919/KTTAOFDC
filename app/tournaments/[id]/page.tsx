import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatDate,
  formatSchedule,
  googleCalendarUrl,
  googleMapsUrl,
  registrationLabel,
  scheduleLines,
  today,
} from "@/lib/dates";
import { pageMetadata } from "@/lib/metadata";
import { getTournament, listTournaments } from "@/lib/store/tournaments";
import { AttachmentList } from "@/components/AttachmentList";
import { ImageViewer } from "@/components/ImageViewer";
import { LinkedText } from "@/components/LinkedText";
import { StatusBadge } from "@/components/TournamentCard";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClockIcon,
  DollarIcon,
  ExternalLinkIcon,
  FileIcon,
  FlagIcon,
  MapPinIcon,
  PhoneIcon,
  UsersIcon,
} from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

// 대회의 '예정/종료' 표시가 날짜에 따라 바뀌므로 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listTournaments()).map((tournament) => ({ id: tournament.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) return { title: "대회 정보" };

  const place = tournament.venue || tournament.address;
  const description = [formatSchedule(tournament), place, tournament.summary]
    .filter(Boolean)
    .join(" · ");
  return pageMetadata({
    title: tournament.title,
    description,
    image: tournament.images[0],
  });
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-bold tracking-wide text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-[15px] leading-relaxed font-medium break-keep text-slate-800">
          {children}
        </dd>
      </div>
    </div>
  );
}

export default async function TournamentPage({ params }: Props) {
  const { id } = await params;
  const tournament = await getTournament(id);
  if (!tournament) notFound();

  const now = today();
  const registration = registrationLabel(tournament, now);
  const mapUrl = googleMapsUrl(tournament);
  // 포스터나 첨부 파일이 있으면 요강 전문은 그 내용을 다시 적은 것입니다.
  const hasSource = tournament.images.length > 0 || tournament.attachments.length > 0;
  const hasDetails = Boolean(tournament.body || tournament.fullText || hasSource);

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        대회 정보
      </Link>

      <header className="mt-5 border-b border-brand-100 pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tournament={tournament} now={now} />
          {registration && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                registration.open
                  ? "bg-accent-50 text-accent-700 ring-1 ring-accent-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {registration.label}
            </span>
          )}
        </div>
        <h1 className="mt-4 text-3xl leading-tight font-black break-keep text-brand-950 md:text-4xl">
          {tournament.title}
        </h1>
        {tournament.summary && (
          <LinkedText
            text={tournament.summary}
            className="mt-4 max-w-3xl text-lg leading-relaxed break-keep text-slate-600"
          />
        )}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* 요약 정보 — 모바일에서는 본문보다 먼저 보입니다 */}
        <aside className="order-first lg:sticky lg:top-24 lg:order-last">
          <div className="card p-6">
            <h2 className="text-base font-black text-brand-950">대회 안내</h2>
            <dl className="mt-5 space-y-4">
              <InfoRow icon={<CalendarIcon className="size-[18px]" />} label="일시">
                {scheduleLines(tournament).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </InfoRow>
              {(tournament.venue || tournament.address) && (
                <InfoRow icon={<MapPinIcon className="size-[18px]" />} label="장소">
                  {tournament.venue && <span className="block">{tournament.venue}</span>}
                  {tournament.address && (
                    <span className="block font-normal text-slate-600">
                      {tournament.address}
                    </span>
                  )}
                </InfoRow>
              )}
              {tournament.organizer && (
                <InfoRow icon={<UsersIcon className="size-[18px]" />} label="주최 · 주관">
                  {tournament.organizer}
                </InfoRow>
              )}
              {tournament.fee && (
                <InfoRow icon={<DollarIcon className="size-[18px]" />} label="참가비">
                  {tournament.fee}
                </InfoRow>
              )}
              {tournament.deadline && (
                <InfoRow icon={<FlagIcon className="size-[18px]" />} label="신청 마감">
                  {formatDate(tournament.deadline)}
                </InfoRow>
              )}
              {tournament.contact && (
                <InfoRow icon={<PhoneIcon className="size-[18px]" />} label="문의">
                  <LinkedText text={tournament.contact} />
                </InfoRow>
              )}
            </dl>

            <div className="mt-6 space-y-2.5">
              {tournament.linkUrl && (
                <a
                  href={tournament.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-accent w-full"
                >
                  {tournament.linkLabel || "관련 링크 열기"}
                  <ExternalLinkIcon className="size-4" />
                </a>
              )}
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm w-full"
                >
                  <MapPinIcon className="size-4" />
                  지도에서 보기
                </a>
              )}
              <a
                href={googleCalendarUrl(tournament)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm w-full"
              >
                <ClockIcon className="size-4" />
                Google 캘린더에 추가
              </a>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-10">
          {tournament.body && (
            <section aria-labelledby="body-heading">
              <h2 id="body-heading" className="mb-4 text-xl font-black text-brand-950">
                대회 소개
              </h2>
              <LinkedText
                text={tournament.body}
                className="text-[15px] leading-7 break-keep text-slate-700 md:text-base md:leading-8"
              />
            </section>
          )}

          {tournament.images.length > 0 && (
            <section aria-labelledby="poster-heading">
              <h2 id="poster-heading" className="mb-4 text-xl font-black text-brand-950">
                대회 포스터
              </h2>
              <ImageViewer images={tournament.images} label={tournament.title} />
            </section>
          )}

          {/* 포스터를 옮겨 적은 글은 같은 내용을 두 번 읽지 않도록 접어 둡니다. */}
          {tournament.fullText && (
            <details open={!hasSource} className="group card overflow-hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 transition-colors hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <FileIcon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-brand-950">요강 전문 글로 보기</span>
                  {hasSource && (
                    <span className="mt-0.5 block text-sm break-keep text-slate-500">
                      포스터나 첨부 파일의 내용을 글로 옮긴 것입니다. 글자가 작아 읽기
                      어렵거나 연락처를 복사할 때 펼쳐 보세요.
                    </span>
                  )}
                </span>
                <ChevronDownIcon className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <LinkedText
                text={tournament.fullText}
                className="border-t border-slate-200 px-5 py-5 text-[15px] leading-7 break-keep text-slate-700 md:text-base md:leading-8"
              />
            </details>
          )}

          {tournament.attachments.length > 0 && (
            <section aria-labelledby="files-heading">
              <h2 id="files-heading" className="mb-4 text-xl font-black text-brand-950">
                첨부 파일
              </h2>
              <AttachmentList files={tournament.attachments} />
            </section>
          )}

          {!hasDetails && (
            <p className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-10 text-center break-keep text-slate-500">
              자세한 대회 요강은 준비되는 대로 이곳에 올려 드립니다.
            </p>
          )}
        </div>
      </div>

      <div className="mt-14 border-t border-brand-100 pt-8 text-center">
        <Link href="/tournaments" className="btn btn-outline">
          <ArrowLeftIcon className="size-4" />
          다른 대회 보기
        </Link>
      </div>
    </article>
  );
}
