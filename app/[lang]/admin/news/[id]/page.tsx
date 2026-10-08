import Link from "next/link";
import { notFound } from "next/navigation";
import { saveNewsPostAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getNewsPost } from "@/lib/store/news";
import { NewsForm } from "@/components/admin/NewsForm";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

export default async function EditNewsPostPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const post = await getNewsPost(id, { includeHidden: true });
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin/news"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        탁구 소식 목록
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-black text-brand-950">소식 수정</h1>
      <NewsForm post={post} action={saveNewsPostAction.bind(null, post.id)} />
    </div>
  );
}
