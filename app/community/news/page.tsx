import { pageMetadata } from "@/lib/metadata";
import { listNewsPosts } from "@/lib/store/news";
import { CommunityTabs } from "@/components/CommunityTabs";
import { NewsCard } from "@/components/NewsCard";
import { PageHeader } from "@/components/PageHeader";
import { NewspaperIcon } from "@/components/icons";

export const metadata = pageMetadata({
  title: "탁구 소식",
  description: "신문에 실린 협회 소식과 탁구인에게 필요한 정보를 전해 드립니다.",
});

export default async function NewsPage() {
  const posts = await listNewsPosts();

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="탁구 소식"
        description="신문에 실린 협회 소식과 회원 여러분께 필요한 정보를 전해 드립니다."
      >
        <CommunityTabs current="/community/news" />
      </PageHeader>

      <div className="mx-auto max-w-4xl px-4 py-14">
        {posts.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 px-6 py-14 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
              <NewspaperIcon className="size-7" />
            </span>
            <p className="mt-5 text-lg font-bold text-brand-950">소식을 준비하고 있습니다</p>
            <p className="mt-2 break-keep text-slate-500">
              신문 기사와 회원 안내가 올라오면 이곳에서 보실 수 있습니다.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id}>
                <NewsCard post={post} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
