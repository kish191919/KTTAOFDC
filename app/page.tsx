import Image from "next/image";
import Link from "next/link";
import { greeting } from "@/lib/content/association";
import { statusOf, today } from "@/lib/dates";
import { site } from "@/lib/site";
import { listAlbums } from "@/lib/store/albums";
import { listHeroMedia } from "@/lib/store/hero";
import { listTournaments } from "@/lib/store/tournaments";
import { AlbumCard } from "@/components/AlbumCard";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { SectionHeading } from "@/components/PageHeader";
import { TournamentCard } from "@/components/TournamentCard";
import { ArrowRightIcon, MailIcon, MapPinIcon } from "@/components/icons";

// 대회의 '예정/종료' 표시가 날짜에 따라 바뀌므로 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export default async function HomePage() {
  const [tournaments, albums, heroMedia] = await Promise.all([
    listTournaments(),
    listAlbums(),
    listHeroMedia(),
  ]);
  const now = today();
  const slides = heroMedia.filter((item) => item.active);

  // 다가오는 대회를 가까운 순서로 먼저 보여 주고, 모자라면 최근 대회로 채웁니다.
  const upcoming = tournaments.filter((t) => statusOf(t, now) !== "past").reverse();
  const past = tournaments.filter((t) => statusOf(t, now) === "past");
  const featured = [...upcoming, ...past].slice(0, 3);

  return (
    <>
      {/* 메인 화면 — 관리자 화면에서 올린 동영상·이미지가 있으면 그것을, 없으면 배너를 보여 줍니다 */}
      {slides.length > 0 ? (
        <HeroSlideshow items={slides} />
      ) : (
        <section className="bg-white">
          <div className="relative mx-auto aspect-[16/9] w-full max-w-[1920px] overflow-hidden sm:aspect-[3/1]">
            <Image
              src="/images/banner.jpg"
              alt={`${site.name} ${site.nameKo} — ${site.nameEn}. ${site.slogan}`}
              fill
              preload
              quality={90}
              sizes="(min-width: 1920px) 1920px, (min-width: 640px) 100vw, 180vw"
              className="object-cover object-center"
            />
          </div>
        </section>
      )}

      {/* 인사말 */}
      <section className="bg-brand-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-12 md:grid-cols-5">
            <div className="order-2 md:order-1 md:col-span-3">
              <span className="eyebrow mb-3">Welcome</span>
              <h2 className="mb-8 text-2xl leading-snug font-bold break-keep text-brand-950 md:text-3xl">
                {greeting.welcome}
              </h2>
              <div className="space-y-5 leading-relaxed break-keep text-slate-600">
                {greeting.paragraphs.slice(0, 4).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <Link href="/about" className="btn btn-brand mt-10">
                협회 소개 더 보기
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>

            <div className="order-1 md:order-2 md:col-span-2">
              {/* 협회장 사진 — 인사말 글과 높이가 맞도록 정사각형으로 잘라 보여 줍니다. */}
              <figure className="mx-auto max-w-xs overflow-hidden rounded-3xl bg-linear-to-br from-brand-700 via-brand-800 to-navy-950 text-white shadow-xl md:max-w-none">
                <Image
                  src={greeting.photo.src}
                  alt={greeting.signature}
                  width={greeting.photo.width}
                  height={greeting.photo.height}
                  sizes="(min-width: 1152px) 420px, (min-width: 768px) 37vw, 320px"
                  className="aspect-square h-auto w-full object-cover object-[50%_30%]"
                />
                <figcaption className="px-7 py-5 md:px-8">
                  <p className="text-lg font-bold text-balance break-keep">
                    {greeting.signature}
                  </p>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* 대회 정보 */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            eyebrow="Tournaments"
            title="대회 정보"
            description="다가오는 대회와 최근 대회 소식을 확인하세요."
          />
          {featured.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {featured.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} now={now} />
              ))}
            </div>
          ) : (
            <p className="card mx-auto max-w-xl px-6 py-10 text-center text-slate-500">
              등록된 대회가 아직 없습니다. 새 대회 소식이 올라오면 이곳에서 안내해 드립니다.
            </p>
          )}
          <div className="mt-10 text-center">
            <Link href="/tournaments" className="btn btn-outline">
              전체 대회 일정 보기
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 갤러리 — 앨범이 등록되어 있을 때만 보입니다 */}
      {albums.length > 0 && (
        <section className="bg-brand-50/60 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHeading
              eyebrow="Gallery"
              title="활동 현장"
              description="대회와 모임의 순간들을 사진으로 만나보세요."
            />
            <div className="grid gap-6 md:grid-cols-3">
              {albums.slice(0, 3).map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/gallery" className="btn btn-outline">
                전체 갤러리 보기
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 슬로건 */}
      <section className="bg-navy-950 py-7">
        <p className="mx-auto max-w-5xl px-4 text-center text-base leading-relaxed text-brand-100 italic sm:text-lg">
          “{site.slogan}”
        </p>
      </section>

      {/* 함께해요 */}
      <section className="bg-linear-to-b from-white to-brand-50 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-black break-keep text-brand-950 md:text-4xl">
            탁구로 하나 되는 즐거움, 함께하세요
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg break-keep text-slate-600">
            가까운 탁구 장소를 찾아보고, 궁금한 점은 언제든지 협회로 문의해 주세요.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/community" className="btn btn-accent px-8 py-4 shadow-md">
              <MapPinIcon className="size-5" />
              탁구 장소 보기
            </Link>
            <a href={`mailto:${site.email}`} className="btn btn-outline px-8 py-4">
              <MailIcon className="size-5" />
              이메일 문의
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
