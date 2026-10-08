import Link from "next/link";
import { deleteNewsPostAction, setNewsPostHiddenAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate, yearOf } from "@/lib/dates";
import { listNewsPosts } from "@/lib/store/news";
import { AdminHeader, AdminNotice } from "@/components/admin/AdminHeader";
import { AdminList, type AdminListItem } from "@/components/admin/AdminList";
import { PlusIcon } from "@/components/icons";

type Props = {
  /** saved 는 방금 저장한 소식의 id 입니다. */
  searchParams: Promise<{ saved?: string; deleted?: string }>;
};

const filters = [
  { key: "public", label: "공개" },
  { key: "hidden", label: "숨김" },
];

export default async function AdminNewsPage({ searchParams }: Props) {
  await requireAdmin();
  const [{ saved, deleted }, news] = await Promise.all([
    searchParams,
    listNewsPosts({ includeHidden: true }),
  ]);
  const savedItem = saved ? news.find((post) => post.id === saved) : undefined;

  const items: AdminListItem[] = news.map((post) => ({
    id: post.id,
    title: post.title,
    meta: `${formatDate(post.date, false)}${post.source ? ` · ${post.source}` : ""}`,
    hidden: Boolean(post.hidden),
    year: yearOf(post.date),
    keywords: [post.en?.title, post.source].filter(Boolean).join(" "),
    filters: [post.hidden ? "hidden" : "public"],
    viewHref: `/community/news/${post.id}`,
    editHref: `/admin/news/${post.id}`,
    deleteMessage: `'${post.title}' 소식을 삭제할까요?\n이미지와 첨부 파일도 함께 지워지며 되돌릴 수 없습니다.`,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin/news" />
      <AdminNotice
        savedHref={savedItem && (savedItem.hidden ? null : `/community/news/${savedItem.id}`)}
        deleted={Boolean(deleted)}
      />

      <section className="mt-8" aria-labelledby="list-heading">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="list-heading" className="text-xl font-black text-brand-950">
            탁구 소식 <span className="text-base font-bold text-slate-400">{news.length}</span>
          </h2>
          <Link href="/admin/news/new" className="btn btn-accent btn-sm">
            <PlusIcon className="size-4" />새 소식 등록
          </Link>
        </div>
        <AdminList
          items={items}
          filters={filters}
          searchPlaceholder="제목·출처로 찾기"
          emptyMessage="등록된 소식이 없습니다. ‘새 소식 등록’을 눌러 신문 기사나 회원 안내를 올려 보세요."
          setHiddenAction={setNewsPostHiddenAction}
          deleteAction={deleteNewsPostAction}
        />
      </section>
    </div>
  );
}
