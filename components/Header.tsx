import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { STORE_WRITABLE } from "@/lib/store/json-file";
import { LockIcon, MailIcon } from "@/components/icons";
import { DesktopNav, MobileNav } from "@/components/HeaderNav";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label={`${site.name} ${site.nameKo} 홈`}
        >
          <Image
            src="/images/logo.png"
            alt={site.name}
            width={1200}
            height={266}
            sizes="170px"
            preload
            className="h-9 w-auto"
          />
          <span className="hidden border-l border-slate-200 pl-3 text-[13px] leading-tight font-semibold text-brand-900 xl:block">
            워싱턴DC
            <br />
            한인탁구협회
          </span>
        </Link>

        <DesktopNav />

        <div className="flex items-center gap-2">
          <a
            href={`mailto:${site.email}`}
            className="btn btn-accent btn-sm hidden sm:inline-flex"
          >
            <MailIcon className="size-4" />
            문의하기
          </a>
          {/* 저장이 막힌 배포 환경(읽기 전용)에서는 관리자 메뉴를 보이지 않습니다. */}
          {STORE_WRITABLE && (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 lg:inline-flex"
            >
              <LockIcon className="size-3.5" />
              관리자
            </Link>
          )}
          <MobileNav showAdmin={STORE_WRITABLE} />
        </div>
      </div>
    </header>
  );
}
