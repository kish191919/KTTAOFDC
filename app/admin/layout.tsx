import type { Metadata } from "next";
import type { ReactNode } from "react";

// 관리자 화면은 검색 엔진에 노출하지 않습니다.
export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[70vh] bg-brand-50/50">{children}</div>;
}
