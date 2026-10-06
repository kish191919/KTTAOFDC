"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { site } from "@/lib/site";
import { CheckIcon, CloseIcon, CopyIcon, ExternalLinkIcon, MailIcon } from "@/components/icons";

type Props = {
  /** 창 안의 문구 (보고 있는 화면의 언어) */
  t: Dictionary["contact"];
  className?: string;
  children: ReactNode;
};

/**
 * 문의 버튼. mailto 링크만 걸어 두면 기본 메일 앱이 없는 컴퓨터에서는 눌러도 아무 일도 일어나지 않으므로,
 * 이메일 주소와 보내는 방법(주소 복사 · Gmail · 메일 앱)을 고르는 창을 띄웁니다.
 */
export function ContactButton({ t, className, children }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mailHint, setMailHint] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const address = useRef<HTMLParagraphElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // 창이 떠 있는 동안에는 뒤의 페이지가 스크롤되지 않게 합니다.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const button = trigger.current;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      // 닫힌 뒤에는 처음 눌렀던 버튼으로 초점을 돌려줍니다.
      button?.focus();
    };
  }, [open]);

  /**
   * 메일 앱이 열리면 이 화면이 초점을 잃거나 가려집니다. 잠시 기다려도 그대로라면
   * 메일 앱이 설정되지 않은 컴퓨터이므로 다른 방법을 안내합니다. (브라우저는 실패를 알려 주지 않습니다)
   */
  function watchMailApp() {
    setMailHint(false);
    let opened = false;
    const mark = () => {
      opened = true;
    };
    window.addEventListener("blur", mark);
    document.addEventListener("visibilitychange", mark);
    window.setTimeout(() => {
      window.removeEventListener("blur", mark);
      document.removeEventListener("visibilitychange", mark);
      if (!opened) setMailHint(true);
    }, 1500);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
    } catch {
      // 복사가 막힌 브라우저에서는 주소를 선택해 두어 직접 복사할 수 있게 합니다.
      if (address.current) window.getSelection()?.selectAllChildren(address.current);
    }
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => {
          setCopied(false);
          setMailHint(false);
          setOpen(true);
        }}
        aria-haspopup="dialog"
        className={className}
      >
        {children}
      </button>

      {/* 헤더의 backdrop-blur 안에서는 fixed 가 헤더 기준으로 잡히므로 body 에 직접 그립니다. */}
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/70 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="card relative w-full max-w-sm p-6 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                autoFocus
                className="absolute top-3 right-3 rounded-full p-2 text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
              >
                <CloseIcon className="size-5" />
              </button>

              <h2 id={titleId} className="text-xl font-black text-brand-950">
                {t.title}
              </h2>
              <p className="mt-2 text-sm break-keep text-slate-600">
                {t.description}
              </p>
              <p
                ref={address}
                className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-lg font-semibold break-all text-brand-900 select-all"
              >
                {site.email}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <button type="button" onClick={copy} className="btn btn-brand">
                  {copied ? <CheckIcon className="size-5" /> : <CopyIcon className="size-5" />}
                  <span aria-live="polite">{copied ? t.copied : t.copy}</span>
                </button>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(site.email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  <ExternalLinkIcon className="size-5" />
                  {t.gmail}
                </a>
                <a href={`mailto:${site.email}`} onClick={watchMailApp} className="btn btn-ghost">
                  <MailIcon className="size-5" />
                  {t.mailApp}
                </a>
              </div>
              <p aria-live="polite" className="text-sm break-keep text-accent-700">
                {mailHint && <span className="mt-3 block">{t.mailAppHint}</span>}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
