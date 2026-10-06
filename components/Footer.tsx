import Image from "next/image";
import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { nav, site } from "@/lib/site";
import { STORE_WRITABLE } from "@/lib/store/json-file";
import { MailIcon } from "@/components/icons";
import { AdminLink } from "@/components/AdminLink";

export function Footer({ lang }: { lang: Locale }) {
  const d = getDictionary(lang);
  return (
    <footer className="bg-navy-950 text-brand-100">
      <div className="h-1 bg-linear-to-r from-accent-500 via-accent-500 to-brand-500" />

      {/* 윗줄: 로고·협회 이름 | 바로가기 · 문의 메일 */}
      <div className="mx-auto flex max-w-6xl flex-col gap-x-8 gap-y-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Image
            src="/images/logo-white.png"
            alt={site.name}
            width={1200}
            height={266}
            sizes="170px"
            className="h-8 w-auto self-start sm:self-auto"
          />
          <div className="leading-tight sm:border-l sm:border-white/15 sm:pl-3">
            <p className="text-sm font-semibold text-white">{d.site.fullName}</p>
            <p className="text-xs text-brand-200" lang={lang === "ko" ? "en" : "ko"}>
              {d.site.otherName}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-x-6 gap-y-3 sm:flex-row sm:items-center">
          <nav aria-label={d.nav.quickLinks}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={localePath(lang, item.href)}
                    className="text-sm text-brand-200 transition-colors hover:text-white"
                  >
                    {item.label[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href={`mailto:${site.email}`}
            className="inline-flex items-center gap-2 text-sm text-brand-200 transition-colors hover:text-white sm:border-l sm:border-white/15 sm:pl-6"
          >
            <MailIcon className="size-4" />
            {site.email}
          </a>
        </div>
      </div>

      {/* 아랫줄: 저작권 · 슬로건 | 표어 · 관리자 */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-x-6 gap-y-1.5 px-4 py-3 text-xs text-brand-300 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-x-3 gap-y-1 sm:flex-row sm:items-center">
            <p>
              © {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
            <p className="italic sm:border-l sm:border-white/15 sm:pl-3">{site.slogan}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="tracking-[0.2em] uppercase">
              Community <span className="text-accent-400">•</span> Health{" "}
              <span className="text-accent-400">•</span> Friendship
            </p>
            {STORE_WRITABLE && (
              <AdminLink className="transition-colors hover:text-white">{d.nav.admin}</AdminLink>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
