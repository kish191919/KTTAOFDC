import type { Metadata } from "next";
import { etiquetteGroups } from "@/lib/content/etiquette";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { CommunityTabs } from "@/components/CommunityTabs";
import { EtiquetteItem } from "@/components/EtiquetteItem";
import { PageHeader } from "@/components/PageHeader";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/community/etiquette",
    title: d.community.etiquette,
    description: d.etiquette.metaDescription,
  });
}

// 번호가 주제를 넘어 1번부터 이어지도록 주제마다 첫 번호를 미리 계산합니다.
const groups = etiquetteGroups.map((group, index) => ({
  ...group,
  first: etiquetteGroups.slice(0, index).reduce((sum, g) => sum + g.items.length, 0) + 1,
}));

const total = etiquetteGroups.reduce((sum, group) => sum + group.items.length, 0);

export default async function EtiquettePage({ params }: Props) {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  const t = d.etiquette;
  // 주제 이름도 설명도 화면 언어 하나로만 보여 줍니다.
  const groupTitle = (group: (typeof groups)[number]) =>
    lang === "en" ? group.titleEn : group.title;

  return (
    <>
      <PageHeader
        eyebrow={d.community.eyebrow}
        title={d.community.etiquette}
        description={t.description(total)}
      >
        <CommunityTabs lang={lang} current="/community/etiquette" />
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.id}
              aria-labelledby={`${group.id}-title`}
              className="card overflow-hidden"
            >
              <header className="flex items-center justify-between gap-4 border-b border-brand-100 bg-brand-50 px-5 py-4">
                <h2
                  id={`${group.id}-title`}
                  className="min-w-0 text-xl font-black break-keep text-brand-950"
                >
                  {groupTitle(group)}
                </h2>
                <span className="shrink-0 text-sm font-bold text-brand-700 tabular-nums">
                  {group.first}–{group.first + group.items.length - 1}
                </span>
              </header>

              <ol start={group.first} className="divide-y divide-slate-100">
                {group.items.map((item, index) => (
                  <EtiquetteItem
                    key={item.title.ko}
                    number={group.first + index}
                    title={item.title[lang]}
                  >
                    <p className="mt-0.5 text-[15px] leading-relaxed break-keep text-slate-600">
                      {item[lang]}
                    </p>
                  </EtiquetteItem>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
