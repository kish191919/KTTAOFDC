import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { site } from "@/lib/site";
import { LockIcon, MailIcon } from "@/components/icons";
import { AdminLink } from "@/components/AdminLink";
import { ContactButton } from "@/components/ContactButton";
import { DesktopNav, MobileNav } from "@/components/HeaderNav";
import { LangToggle } from "@/components/LangToggle";

export function Header({ lang }: { lang: Locale }) {
  const d = getDictionary(lang);
  // 영어 화면은 메뉴와 로고 옆 글자가 길어 자리가 모자라므로 관리자 버튼을 자물쇠만 보여 줍니다.
  const adminIconOnly = lang === "en";
  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/95 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href={localePath(lang, "/")}
          className="flex shrink-0 items-center gap-3"
          aria-label={d.site.homeLabel}
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
            {d.site.logoLines[0]}
            <br />
            {d.site.logoLines[1]}
          </span>
        </Link>

        <DesktopNav lang={lang} label={d.nav.main} />

        <div className="flex items-center gap-2">
          {/* 한국어 ↔ 영어 전환. 휴대폰 화면에서도 항상 보입니다. */}
          <LangToggle lang={lang} label={d.langToggle.label} title={d.langToggle.short} />
          {/* 관리자 로그인. 휴대폰 화면에서는 문의 버튼과 함께 메뉴 안에 들어갑니다. */}
          <AdminLink
            title={adminIconOnly ? d.nav.admin : undefined}
            className={`btn btn-ghost btn-sm hidden sm:inline-flex ${adminIconOnly ? "size-9 p-0" : ""}`}
          >
            <LockIcon className="size-4" />
            <span className={adminIconOnly ? "sr-only" : undefined}>{d.nav.admin}</span>
          </AdminLink>
          <ContactButton t={d.contact} className="btn btn-accent btn-sm hidden sm:inline-flex">
            <MailIcon className="size-4" />
            {d.nav.contact}
          </ContactButton>
          <MobileNav lang={lang} t={d.nav} contact={d.contact} />
        </div>
      </div>
    </header>
  );
}
