import { about, bylawsUrl, greeting, leadership } from "@/lib/content/association";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";
import { PageHeader, SectionHeading } from "@/components/PageHeader";
import { FileIcon, PaddleMark } from "@/components/icons";

export const metadata = pageMetadata({
  title: "협회 소개",
  description: `${site.nameKo}(${site.name}) 협회장 인사말과 임원진, 협회 정관을 소개합니다.`,
});

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="협회 소개" description={greeting.welcome} />

      {/* 협회장 인사말 */}
      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-5 md:gap-16">
          <div className="md:col-span-2">
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-700 via-brand-800 to-navy-950 p-8 text-white shadow-xl md:sticky md:top-28 md:p-10">
              <div
                aria-hidden="true"
                className="absolute -top-20 -right-20 size-56 rounded-full border-[26px] border-accent-500"
              />
              <PaddleMark light className="relative size-16" />
              <p className="relative mt-8 text-xl font-bold">{site.nameKo}</p>
              <p className="relative mt-1 text-sm text-brand-100">{site.nameEn}</p>
              <p className="relative mt-8 border-t border-white/15 pt-6 text-sm leading-relaxed text-brand-100 italic">
                “{site.slogan}”
              </p>
            </div>
          </div>

          <div className="md:col-span-3">
            <span className="eyebrow mb-3">Welcome Message</span>
            <h2 className="mb-6 text-2xl font-black text-brand-950 md:text-3xl">
              협회장 인사말
            </h2>
            <div className="space-y-4 leading-relaxed break-keep text-slate-600">
              {greeting.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p className="pt-2 text-right font-semibold text-slate-800">
                {greeting.signature}
              </p>
            </div>

            <div className="mt-12 rounded-2xl border border-brand-100 bg-brand-50/60 p-7">
              <h2 className="text-xl font-black text-brand-950">{about.lead}</h2>
              <p className="mt-3 leading-relaxed break-keep text-slate-600">{about.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 임원진 */}
      <section className="bg-brand-50/60 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <SectionHeading
            eyebrow="Leadership Team"
            title="임원진"
            description={leadership.intro}
          />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.members.map((member) => (
              <li key={`${member.role}-${member.name}`} className="card p-6 text-center">
                <p className="text-sm font-bold text-accent-600">
                  {member.role}{" "}
                  <span className="font-medium text-slate-400">{member.roleEn}</span>
                </p>
                <p className="mt-2 text-lg font-bold text-brand-950">{member.name}</p>
                {member.note && (
                  <p className="mt-1.5 text-sm break-keep text-slate-500">{member.note}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-center text-sm text-slate-500">
            임기 {leadership.term}
          </p>
        </div>
      </section>

      {/* 정관 */}
      <section className="bg-white py-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center">
          <h2 className="text-2xl font-black text-brand-950 md:text-3xl">협회 정관</h2>
          <p className="max-w-xl break-keep text-slate-600">
            협회의 목적과 운영 원칙을 담은 정관을 PDF 문서로 확인하실 수 있습니다.
          </p>
          <a
            href={bylawsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline"
          >
            <FileIcon className="size-5" />
            협회 정관 보기 (PDF)
          </a>
        </div>
      </section>
    </>
  );
}
