"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localePath, stripLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { nav } from "@/lib/site";
import { CloseIcon, LockIcon, MenuIcon } from "@/components/icons";
import { AdminLink } from "@/components/AdminLink";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 언어 표시(/en)를 뗀 지금 주소. 메뉴의 href 와 바로 견줄 수 있습니다.
 * 미리 만들어 둔 한국어 페이지는 서버가 아는 주소(/ko/about)와 주소창(/about)이 다르므로
 * 이렇게 맞춰야 서버와 브라우저가 같은 메뉴를 '현재 위치'로 표시합니다.
 */
function useCurrentPath() {
  return stripLocale(usePathname());
}

export function DesktopNav({ lang, label }: { lang: Locale; label: string }) {
  const pathname = useCurrentPath();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label={label}>
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={localePath(lang, item.href)}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-base font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {item.label[lang]}
          </Link>
        );
      })}
    </nav>
  );
}

type MobileNavProps = {
  lang: Locale;
  t: Dictionary["nav"];
};

export function MobileNav({ lang, t }: MobileNavProps) {
  const pathname = useCurrentPath();
  const [open, setOpen] = useState(false);

  // 메뉴가 열려 있는 동안 Esc 로 닫을 수 있게 합니다.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? t.close : t.open}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="relative z-10 rounded-lg p-2 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>

      {open && (
        <>
          {/* 메뉴 바깥 화면을 누르면 닫히도록 화면 전체를 덮는 투명한 층입니다.
              헤더의 backdrop-blur 때문에 fixed 는 헤더 기준으로 잡히므로 absolute + h-dvh 를 씁니다. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-x-0 top-0 h-dvh"
          />
          <div
            id="mobile-menu"
            className="absolute inset-x-0 top-[72px] border-b border-brand-100 bg-white shadow-lg"
          >
            <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3" aria-label={t.mobile}>
              {nav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={localePath(lang, item.href)}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-lg px-4 py-3 text-base font-medium ${
                      active ? "bg-brand-50 text-brand-700" : "text-slate-700"
                    }`}
                  >
                    {item.label[lang]}
                  </Link>
                );
              })}
              <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
                <AdminLink className="btn btn-ghost btn-sm flex-1">
                  <LockIcon className="size-4" />
                  {t.admin}
                </AdminLink>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
