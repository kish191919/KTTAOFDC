import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeNewsPost } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { listNewsPosts } from "@/lib/store/news";
import { CommunityTabs } from "@/components/CommunityTabs";
import { NewsCard } from "@/components/NewsCard";
import { PageHeader } from "@/components/PageHeader";
import { NewspaperIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string }> };

// 저장하면 바로 새로 만들어지지만, 이 사이트 밖(내 컴퓨터·스크립트)에서 고친 내용도
// 반영되도록 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  return pageMetadata({
    lang,
    path: "/community/news",
    title: d.community.news,
    description: d.news.metaDescription,
  });
}

export default async function NewsPage({ params }: Props) {
  const lang = await readLang(params);
  const d = getDictionary(lang);
  const t = d.news;
  const posts = (await listNewsPosts()).map((post) => localizeNewsPost(post, lang));

  return (
    <>
      <PageHeader eyebrow={d.community.eyebrow} title={d.community.news} description={t.description}>
        <CommunityTabs lang={lang} current="/community/news" />
      </PageHeader>

      <div className="mx-auto max-w-4xl px-4 py-14">
        {posts.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
              <NewspaperIcon className="size-7" />
            </span>
            <p className="mt-5 text-lg font-bold text-brand-950">{t.emptyTitle}</p>
            <p className="mt-2 break-keep text-slate-500">{t.emptyDescription}</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id}>
                <NewsCard post={post} lang={lang} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
