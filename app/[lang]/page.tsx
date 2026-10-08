import Image from "next/image";
import Link from "next/link";
import { greeting, homeIntro, welcomePhoto } from "@/lib/content/association";
import { statusOf, today } from "@/lib/dates";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeAlbum, localizeTournament } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { site } from "@/lib/site";
import { siteJsonLd } from "@/lib/structured-data";
import { listAlbums } from "@/lib/store/albums";
import { listHeroMedia } from "@/lib/store/hero";
import { listTournaments } from "@/lib/store/tournaments";
import { AlbumCard } from "@/components/AlbumCard";
import { ContactButton } from "@/components/ContactButton";
import { HeroSlideshow } from "@/components/HeroSlideshow";
import { JsonLd } from "@/components/JsonLd";
import { SectionHeading } from "@/components/PageHeader";
import { KeepParens, Phrases } from "@/components/Phrases";
import { TournamentCard } from "@/components/TournamentCard";
import { ArrowRightIcon, MailIcon, MapPinIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string }> };

// 대회의 '예정/종료' 표시가 날짜에 따라 바뀌므로 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export default async function HomePage({ params }: Props) {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  const t = d.home;
  const [tournaments, albums, heroMedia] = await Promise.all([
    listTournaments(),
    listAlbums(),
    listHeroMedia(),
  ]);
  const now = today();
  const slides = heroMedia.filter((item) => item.active);

  // 다가오는 대회를 가까운 순서로 먼저 보여 주고, 모자라면 최근 대회로 채웁니다.
  const upcoming = tournaments.filter((item) => statusOf(item, now) !== "past").reverse();
  const past = tournaments.filter((item) => statusOf(item, now) === "past");
  const featured = [...upcoming, ...past]
    .slice(0, 3)
    .map((item) => localizeTournament(item, lang));

  return (
    <>
      <JsonLd data={siteJsonLd(lang)} />

      {/* 메인 화면 — 관리자 화면에서 올린 동영상·이미지가 있으면 그것을, 없으면 배너를 보여 줍니다 */}
      {slides.length > 0 ? (
        <HeroSlideshow items={slides} lang={lang} />
      ) : (
        <section className="bg-white">
          <div className="relative mx-auto aspect-[16/9] w-full max-w-[1920px] overflow-hidden sm:aspect-[3/1]">
            <Image
              src="/images/banner.jpg"
              alt={t.bannerAlt}
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
      <section className="bg-brand-50/60 py-14 lg:py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 lg:grid-cols-5 lg:gap-12">
          <div className="text-center lg:col-span-2 lg:text-left">
            <span className="eyebrow mb-3">{t.welcomeEyebrow}</span>
            {/* 이 화면의 큰 제목(h1). 검색 사이트가 협회 이름을 여기서 읽습니다. */}
            {/* 협회 이름은 크게, 인사는 그 아래 한 줄로 작게 놓아 말이 중간에서 끊기지 않게 합니다. */}
            <h1 className="break-keep text-brand-950">
              <span className="block text-2xl leading-tight font-bold text-balance min-[360px]:text-3xl md:text-4xl lg:text-3xl xl:text-4xl">
                {d.site.fullName}
              </span>{" "}
              <span className="mt-2 block text-base leading-snug font-medium text-balance text-brand-800 min-[360px]:text-lg md:text-xl lg:text-lg xl:text-xl">
                {greeting.thanks[lang]}
              </span>
            </h1>
            {/* 문장마다 새 줄에서 시작하고, 마지막 줄에 한 낱말만 남지 않게 합니다. 한 단으로 쌓이는 화면에서는 줄이 너무 길어지지 않게 폭을 줄입니다. */}
            <div className="mx-auto mt-5 max-w-xl space-y-2 leading-relaxed text-pretty break-keep text-slate-600 lg:max-w-none">
              {homeIntro[lang].map((sentence) => (
                <p key={sentence}>
                  <KeepParens text={sentence} />
                </p>
              ))}
            </div>
            <p className="mt-4 leading-relaxed font-medium text-balance break-keep text-brand-900">
              <Phrases parts={greeting.summary[lang]} />
            </p>
            <Link href={localePath(lang, "/about")} className="btn btn-brand btn-sm mt-6">
              {t.aboutLink}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          {/* 회원 단체 사진 — 모두가 보이도록 자르지 않고 원래 비율로 보여 줍니다. */}
          <figure className="overflow-hidden rounded-2xl shadow-lg lg:col-span-3">
            <Image
              src={welcomePhoto.src}
              alt={welcomePhoto.alt[lang]}
              width={welcomePhoto.width}
              height={welcomePhoto.height}
              sizes="(min-width: 1152px) 653px, (min-width: 1024px) 58vw, 100vw"
              className="h-auto w-full"
            />
          </figure>
        </div>
      </section>

      {/* 대회 정보 */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            eyebrow={t.tournamentsEyebrow}
            title={t.tournamentsTitle}
            description={t.tournamentsDescription}
          />
          {featured.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {featured.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  now={now}
                  lang={lang}
                />
              ))}
            </div>
          ) : (
            <p className="card mx-auto max-w-xl px-6 py-10 text-center text-slate-500">
              {t.tournamentsEmpty}
            </p>
          )}
          <div className="mt-10 text-center">
            <Link href={localePath(lang, "/tournaments")} className="btn btn-outline">
              {t.tournamentsLink}
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
              eyebrow={t.galleryEyebrow}
              title={t.galleryTitle}
              description={t.galleryDescription}
            />
            <div className="grid gap-6 md:grid-cols-3">
              {albums.slice(0, 3).map((album) => (
                <AlbumCard key={album.id} album={localizeAlbum(album, lang)} lang={lang} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href={localePath(lang, "/gallery")} className="btn btn-outline">
                {t.galleryLink}
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
            {t.joinTitle}
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-lg break-keep text-slate-600">
            {t.joinDescription}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={localePath(lang, "/community")}
              className="btn btn-accent px-8 py-4 shadow-md"
            >
              <MapPinIcon className="size-5" />
              {t.venuesLink}
            </Link>
            <ContactButton t={d.contact} className="btn btn-outline px-8 py-4">
              <MailIcon className="size-5" />
              {t.emailLink}
            </ContactButton>
          </div>
        </div>
      </section>
    </>
  );
}
