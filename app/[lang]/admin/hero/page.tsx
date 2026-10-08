import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listHeroMedia, MAX_HERO_MEDIA } from "@/lib/store/hero";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { HeroManager } from "@/components/admin/HeroManager";
import { ExternalLinkIcon } from "@/components/icons";

export default async function AdminHeroPage() {
  await requireAdmin();
  const items = await listHeroMedia();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin/hero" />

      <section className="mt-8" aria-labelledby="hero-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="hero-heading" className="text-xl font-black text-brand-950">
              메인 화면
            </h2>
            <p className="mt-1 text-sm break-keep text-slate-500">
              홈 화면 맨 위에서 재생되는 동영상과 이미지를 올리고 순서를 정합니다.
            </p>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm">
            홈 화면 보기
            <ExternalLinkIcon className="size-4" />
          </Link>
        </div>
        <HeroManager items={items} max={MAX_HERO_MEDIA} />
      </section>
    </div>
  );
}
