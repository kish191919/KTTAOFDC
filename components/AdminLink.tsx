import type { ReactNode } from "react";

/**
 * 관리자 화면(/admin)으로 가는 링크.
 * 관리자 화면은 한국어만 있어서 영어 화면에서 누르면 언어가 바뀝니다. 언어가 바뀌는 이동은
 * 언어 전환 버튼(LangToggle)과 마찬가지로 Link 가 아닌 일반 링크로 문서를 새로 엽니다.
 */
export function AdminLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- 위 설명대로 일부러 일반 링크를 씁니다.
    <a href="/admin" className={className}>
      {children}
    </a>
  );
}
