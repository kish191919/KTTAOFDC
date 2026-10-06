"use client";

import { usePathname } from "next/navigation";
import { localePath, stripLocale, type Locale } from "@/lib/i18n/config";
import { KoreaFlagMark, UsFlagMark } from "@/components/icons";

type Props = {
  /** 지금 보고 있는 화면의 언어 */
  lang: Locale;
  /** 버튼의 이름(접근성)과 마우스를 올렸을 때 보이는 짧은 설명. 바꿀 언어로 적은 문구를 받습니다. */
  label: string;
  title: string;
};

/**
 * 한국어 ↔ 영어 전환 버튼. 지금 보고 있는 페이지의 다른 언어 주소로 갑니다.
 * 버튼에는 '바꿀 언어'의 국기를 보여 줍니다. (한국어 화면에는 성조기, 영어 화면에는 태극기)
 */
export function LangToggle({ lang, label, title }: Props) {
  // 미리 만들어 둔 한국어 페이지는 서버가 아는 주소(/ko/about)와 주소창(/about)이 다르므로
  // 언어 표시를 떼어 내 양쪽에서 같은 값이 되게 합니다.
  const path = stripLocale(usePathname());
  const other: Locale = lang === "ko" ? "en" : "ko";
  const Flag = other === "en" ? UsFlagMark : KoreaFlagMark;
  // 관리자 화면은 한국어만 있으므로 그곳에서는 영어 홈으로 갑니다.
  const target = localePath(other, path.startsWith("/admin") ? "/" : path);

  // 언어가 바뀌면 <html lang> 을 포함해 화면 전체가 달라지므로 Link 가 아닌 일반 링크로 문서를 새로 엽니다.
  // (Link 로 두면 영어 화면에서 "/about" 을 '언어 자리에 about 이 들어간 주소'로 잘못 짐작해 미리 불러오다 404 가 납니다)
  return (
    <a
      href={target}
      hrefLang={other}
      lang={other}
      aria-label={label}
      title={title}
      className="block size-9 shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-slate-300 transition hover:shadow-md hover:ring-2 hover:ring-brand-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <Flag className="size-full" />
    </a>
  );
}
