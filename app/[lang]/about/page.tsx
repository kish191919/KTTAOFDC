import type { Metadata } from "next";
import Image from "next/image";
import {
  about,
  bylawsUrl,
  greeting,
  groupPhoto,
  leadership,
} from "@/lib/content/association";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";
import { PageHeader, SectionHeading } from "@/components/PageHeader";
import { FileIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const t = getDictionary(lang).about;
  return pageMetadata({ lang, path: "/about", title: t.title, description: t.metaDescription });
}

export default async function AboutPage({ params }: Props) {
  const lang = await readLang(params);
  const t = getDictionary(lang).about;

  return (
    <>
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={greeting.welcome[lang]} />

      {/* 협회장 인사말 */}
      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-5 md:grid-rows-[auto_1fr] md:gap-x-16">
          {/* 사진은 모바일에서 인사말 아래에 작게, md 부터는 인사말 왼쪽에 크게 놓습니다. */}
          <div className="order-1 md:order-none md:col-span-2 md:row-span-2">
            <figure className="mx-auto max-w-60 overflow-hidden rounded-3xl bg-linear-to-br from-brand-700 via-brand-800 to-navy-950 text-white shadow-xl md:sticky md:top-28 md:max-w-none">
              <Image
                src={greeting.photo.src}
                alt={greeting.signature[lang]}
                width={greeting.photo.width}
                height={greeting.photo.height}
                sizes="(min-width: 1152px) 410px, (min-width: 768px) 36vw, 240px"
                loading="eager"
                className="h-auto w-full"
              />
              <figcaption className="px-5 py-5 md:px-8 md:py-6">
                <p className="font-bold break-keep md:text-lg">{greeting.signature[lang]}</p>
                <p className="mt-3 border-t border-white/15 pt-3 text-sm leading-relaxed text-brand-100 italic md:mt-4 md:pt-4">
                  “{site.slogan}”
                </p>
              </figcaption>
            </figure>
          </div>

          <div className="md:col-span-3">
            <span className="eyebrow mb-3">{t.greetingEyebrow}</span>
            <h2 className="mb-6 text-2xl font-black text-brand-950 md:text-3xl">
              {t.greetingTitle}
            </h2>
            <div className="space-y-4 leading-relaxed break-keep text-slate-600">
              {greeting.paragraphs[lang].map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="pt-2 text-right font-semibold text-slate-800">
                {greeting.signature[lang]}
              </p>
            </div>
          </div>

          <div className="order-2 rounded-2xl border border-brand-100 bg-brand-50/60 p-7 md:order-none md:col-span-3 md:self-start">
            <h2 className="text-xl font-black text-brand-950">{about.lead[lang]}</h2>
            <p className="mt-3 leading-relaxed break-keep text-slate-600">{about.body[lang]}</p>
          </div>
        </div>
      </section>

      {/* 임원진 */}
      <section className="bg-brand-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            eyebrow={t.leadershipEyebrow}
            title={t.leadershipTitle}
            description={leadership.intro[lang]}
          />
          {/* 모바일에서는 한 화면에 모두 보이도록 카드 한 장 안에 줄 목록으로,
              sm 부터는 한 사람씩 카드로 나누어 보여 줍니다. */}
          <ul className="card divide-y divide-slate-100 sm:grid sm:grid-cols-2 sm:gap-5 sm:divide-y-0 sm:border-0 sm:bg-transparent sm:shadow-none lg:grid-cols-4">
            {leadership.members.map((member) => (
              <li
                key={`${member.role.ko}-${member.name.ko}`}
                className="flex items-baseline justify-between gap-4 px-5 py-2.5 sm:block sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white sm:p-6 sm:text-center sm:shadow-sm"
              >
                <p className="shrink-0 text-sm font-bold text-accent-600">
                  {member.role[lang]}
                  {/* 한국어 화면에서는 직책의 영문 이름을 옆에 함께 적습니다. */}
                  {lang === "ko" && (
                    <>
                      {" "}
                      <span className="font-medium text-slate-400">{member.role.en}</span>
                    </>
                  )}
                </p>
                <p className="text-right font-bold text-balance text-brand-950 sm:mt-2 sm:text-center sm:text-lg">
                  {member.name[lang]}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center text-sm text-slate-500 sm:mt-8">
            {t.term(leadership.term)}
          </p>
        </div>
      </section>

      {/* 정관 */}
      <section className="bg-white py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center">
          <h2 className="text-2xl font-black text-brand-950 md:text-3xl">{t.bylawsTitle}</h2>
          <p className="max-w-xl break-keep text-slate-600">{t.bylawsDescription}</p>
          <a
            href={bylawsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            <FileIcon className="size-5" />
            {t.bylawsLink}
          </a>
        </div>
      </section>

      {/* 회원 단체 사진 — 화면 양 끝까지 가득 채웁니다. */}
      <section className="bg-white">
        <Image
          src={groupPhoto.src}
          alt={groupPhoto.alt[lang]}
          width={groupPhoto.width}
          height={groupPhoto.height}
          sizes="100vw"
          className="h-auto w-full"
        />
      </section>
    </>
  );
}
