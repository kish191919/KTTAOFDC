import Link from "next/link";
import { saveNewsPostAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { today } from "@/lib/dates";
import { NewsForm } from "@/components/admin/NewsForm";
import { ArrowLeftIcon } from "@/components/icons";

export default async function NewNewsPostPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        홈페이지 관리
      </Link>
      <h1 className="mt-4 mb-8 text-3xl font-black text-brand-950">새 소식 등록</h1>
      <NewsForm defaultDate={today()} action={saveNewsPostAction.bind(null, null)} />
    </div>
  );
}
