import { etiquetteGroups } from "@/lib/content/etiquette";
import { pageMetadata } from "@/lib/metadata";
import { CommunityTabs } from "@/components/CommunityTabs";
import { PageHeader } from "@/components/PageHeader";

export const metadata = pageMetadata({
  title: "탁구 에티켓",
  description: "탁구장에서 서로 즐겁게 운동하기 위해 지켜야 할 에티켓을 안내합니다.",
});

// 번호가 주제를 넘어 1번부터 이어지도록 주제마다 첫 번호를 미리 계산합니다.
const groups = etiquetteGroups.map((group, index) => ({
  ...group,
  first: etiquetteGroups.slice(0, index).reduce((sum, g) => sum + g.items.length, 0) + 1,
}));

const total = etiquetteGroups.reduce((sum, group) => sum + group.items.length, 0);

export default function EtiquettePage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="탁구 에티켓"
        description={`Table Tennis Etiquette — 모두가 즐겁게 운동하기 위한 ${total}가지 약속입니다.`}
      >
        <CommunityTabs current="/community/etiquette" />
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14">
        <nav aria-label="주제 바로가기" className="flex flex-wrap justify-center gap-2">
          {groups.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {group.title}
              <span className="ml-1.5 font-bold text-brand-600">{group.items.length}</span>
            </a>
          ))}
        </nav>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            // scroll-mt: 바로가기로 이동했을 때 위에 고정된 메뉴에 제목이 가려지지 않게
            <section
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-title`}
              className="card scroll-mt-24 overflow-hidden"
            >
              <header className="flex items-center justify-between gap-4 border-b border-brand-100 bg-brand-50 px-5 py-4">
                <div className="min-w-0">
                  <h2
                    id={`${group.id}-title`}
                    className="text-xl font-black break-keep text-brand-950"
                  >
                    {group.title}
                  </h2>
                  <p
                    className="mt-0.5 text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase"
                    lang="en"
                  >
                    {group.titleEn}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold text-brand-700 tabular-nums">
                  {group.first}–{group.first + group.items.length - 1}
                </span>
              </header>

              <ol start={group.first} className="divide-y divide-slate-100">
                {group.items.map((item, index) => (
                  <li key={item.title} className="flex gap-3 px-5 py-4">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white tabular-nums"
                    >
                      {group.first + index}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold break-keep text-brand-950">{item.title}</h3>
                      <p className="mt-0.5 text-[15px] leading-relaxed break-keep text-slate-600">
                        {item.ko}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500" lang="en">
                        {item.en}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
