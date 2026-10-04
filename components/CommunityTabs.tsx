import Link from "next/link";

const tabs = [
  { href: "/community", label: "탁구 장소" },
  { href: "/community/etiquette", label: "탁구 에티켓" },
] as const;

/** 커뮤니티 메뉴 안의 두 페이지를 오가는 탭 */
export function CommunityTabs({ current }: { current: (typeof tabs)[number]["href"] }) {
  return (
    <nav aria-label="커뮤니티 메뉴" className="mt-8 flex justify-center gap-2">
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-brand-700 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
