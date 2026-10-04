import { etiquette } from "@/lib/content/etiquette";
import { pageMetadata } from "@/lib/metadata";
import { CommunityTabs } from "@/components/CommunityTabs";
import { PageHeader } from "@/components/PageHeader";

export const metadata = pageMetadata({
  title: "탁구 에티켓",
  description: "탁구장에서 서로 즐겁게 운동하기 위해 지켜야 할 에티켓을 안내합니다.",
});

export default function EtiquettePage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="탁구 에티켓"
        description="Table Tennis Etiquette — 모두가 즐겁게 운동하기 위한 약속입니다."
      >
        <CommunityTabs current="/community/etiquette" />
      </PageHeader>

      <div className="mx-auto max-w-4xl px-4 py-14">
        <ol className="space-y-3">
          {etiquette.map((item, index) => (
            <li key={item.ko} className="card flex gap-4 p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="leading-relaxed font-semibold break-keep text-slate-800">
                  {item.ko}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500" lang="en">
                  {item.en}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
