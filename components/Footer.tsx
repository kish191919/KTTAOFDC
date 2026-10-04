import Image from "next/image";
import Link from "next/link";
import { nav, site } from "@/lib/site";
import { MailIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="bg-navy-950 text-brand-100">
      <div className="h-1 bg-linear-to-r from-accent-500 via-accent-500 to-brand-500" />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image
              src="/images/logo-white.png"
              alt={site.name}
              width={1200}
              height={266}
              sizes="170px"
              className="h-9 w-auto"
            />
            <p className="mt-4 text-base font-semibold text-white">{site.nameKo}</p>
            <p className="text-sm text-brand-200">{site.nameEn}</p>
            <p className="mt-4 text-sm text-brand-300 italic">{site.slogan}</p>
          </div>

          <nav aria-label="바로가기">
            <p className="text-sm font-semibold tracking-wider text-white uppercase">
              바로가기
            </p>
            <ul className="mt-4 space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-brand-200 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-sm font-semibold tracking-wider text-white uppercase">
              문의
            </p>
            <a
              href={`mailto:${site.email}`}
              className="mt-4 inline-flex items-center gap-2 text-sm text-brand-200 transition-colors hover:text-white"
            >
              <MailIcon className="size-4" />
              {site.email}
            </a>
            <p className="mt-6 text-xs tracking-[0.2em] text-brand-300 uppercase">
              Community <span className="text-accent-400">•</span> Health{" "}
              <span className="text-accent-400">•</span> Friendship
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-5 text-xs text-brand-300 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <Link href="/admin" className="transition-colors hover:text-white">
            관리자
          </Link>
        </div>
      </div>
    </footer>
  );
}
