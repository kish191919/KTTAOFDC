"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/lib/site";
import { CloseIcon, LockIcon, MailIcon, MenuIcon } from "@/components/icons";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="주 메뉴">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-4 py-2 text-base font-medium transition-colors ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-700 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
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
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
      >
        {open ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-[72px] border-b border-brand-100 bg-white shadow-lg"
        >
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3" aria-label="모바일 메뉴">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-4 py-3 text-base font-medium ${
                    active ? "bg-brand-50 text-brand-700" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
              <a href={`mailto:${site.email}`} className="btn btn-accent btn-sm flex-1">
                <MailIcon className="size-4" />
                문의하기
              </a>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm flex-1"
              >
                <LockIcon className="size-4" />
                관리자
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
