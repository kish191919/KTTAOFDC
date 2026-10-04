import type { Metadata } from "next";
import type { ReactNode } from "react";

// 관리자 화면은 로그인 상태와 환경 변수에 따라 달라지므로 미리 만들어 두지 않고
// 요청이 올 때마다 새로 그립니다.
export const dynamic = "force-dynamic";

// 관리자 화면은 검색 엔진에 노출하지 않습니다.
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[70vh] bg-brand-50/50">{children}</div>;
}
