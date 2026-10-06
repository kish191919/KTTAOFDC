import Link from "next/link";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

const tabs = [
  { href: "/community/news", key: "news" },
  { href: "/community", key: "venues" },
  { href: "/community/etiquette", key: "etiquette" },
] as const;

type Props = {
  lang: Locale;
  current: (typeof tabs)[number]["href"];
};

/** 커뮤니티 메뉴 안의 페이지들을 오가는 탭 */
export function CommunityTabs({ lang, current }: Props) {
  const t = getDictionary(lang).community;
  return (
    // 탭 세 개가 좁은 휴대폰 화면에서도 넘치지 않도록 여백을 줄이고, 그래도 모자라면 줄을 바꿉니다.
    <nav aria-label={t.tabsLabel} className="mt-8 flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={localePath(lang, tab.href)}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
              active
                ? "bg-brand-700 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {t[tab.key]}
          </Link>
        );
      })}
    </nav>
  );
}
