import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { CheckIcon, ExternalLinkIcon, LogOutIcon } from "@/components/icons";

const tabs = [
  { href: "/admin", label: "관리 홈" },
  { href: "/admin/hero", label: "메인 화면" },
  { href: "/admin/tournaments", label: "대회 정보" },
  { href: "/admin/albums", label: "갤러리 앨범" },
  { href: "/admin/news", label: "탁구 소식" },
] as const;

type Props = {
  current: (typeof tabs)[number]["href"];
};

/** 관리 화면 맨 위의 제목·로그아웃 버튼과, 구역(메인 화면·대회·앨범·소식)을 오가는 탭 */
export function AdminHeader({ current }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-950">홈페이지 관리</h1>
          <p className="mt-1 break-keep text-slate-500">
            메인 화면 동영상, 대회 정보, 갤러리 사진, 탁구 소식을 등록하고 수정합니다.
          </p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-ghost btn-sm">
            <LogOutIcon className="size-4" />
            로그아웃
          </button>
        </form>
      </div>

      {/* 탭 다섯 개가 좁은 휴대폰 화면에서도 넘치지 않도록 모자라면 줄을 바꿉니다. */}
      <nav aria-label="관리 메뉴" className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.href === current;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors sm:px-5 ${
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
    </>
  );
}

type NoticeProps = {
  /** 방금 저장한 글의 방문자용 주소. 숨긴 글이면 null 이고, 저장한 글이 없으면 주지 않습니다. */
  savedHref?: string | null;
  deleted?: boolean;
};

/** 저장하거나 삭제한 뒤 목록 위에 보여 주는 안내 */
export function AdminNotice({ savedHref, deleted }: NoticeProps) {
  return (
    <>
      {savedHref !== undefined && (
        <p className="mt-6 flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-200 bg-white p-4 text-sm font-medium text-brand-800">
          <CheckIcon className="size-4 shrink-0" />
          저장했습니다.
          {/* 숨긴 대회·앨범·소식은 방문자용 페이지가 없으므로 링크를 보여 주지 않습니다. */}
          {savedHref ? (
            <Link
              href={savedHref}
              className="inline-flex items-center gap-1 font-bold underline underline-offset-2"
            >
              게시된 페이지 보기
              <ExternalLinkIcon className="size-3.5" />
            </Link>
          ) : (
            <span>숨김 상태라 방문자에게는 아직 보이지 않습니다.</span>
          )}
        </p>
      )}
      {deleted && (
        <p className="mt-6 flex items-center gap-2.5 rounded-xl border border-brand-200 bg-white p-4 text-sm font-medium text-brand-800">
          <CheckIcon className="size-4 shrink-0" />
          삭제했습니다.
        </p>
      )}
    </>
  );
}
