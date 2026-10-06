import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listHeroMedia, MAX_HERO_MEDIA } from "@/lib/store/hero";
import { STORE_WRITABLE } from "@/lib/store/json-file";
import { HeroManager } from "@/components/admin/HeroManager";
import { ArrowLeftIcon, ExternalLinkIcon } from "@/components/icons";

export default async function AdminHeroPage() {
  await requireAdmin();
  const items = await listHeroMedia();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        홈페이지 관리
      </Link>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-brand-950">메인 화면 관리</h1>
          <p className="mt-1 break-keep text-slate-500">
            홈 화면 맨 위에서 재생되는 동영상과 이미지를 올리고 순서를 정합니다.
          </p>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm">
          홈 화면 보기
          <ExternalLinkIcon className="size-4" />
        </Link>
      </div>
      <HeroManager items={items} max={MAX_HERO_MEDIA} readOnly={!STORE_WRITABLE} />
    </div>
  );
}
