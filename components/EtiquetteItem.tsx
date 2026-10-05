"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

type Props = {
  /** 주제를 넘어 1번부터 이어지는 번호 */
  number: number;
  title: string;
  /** 한국어·영어 설명 등 펼쳤을 때 보이는 내용 */
  children: ReactNode;
};

const badge =
  "size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white tabular-nums";

/**
 * 탁구 에티켓 한 항목.
 * 모바일에서는 번호와 제목만 보이고 누르면 설명이 펼쳐집니다. md 이상에서는 항상 펼쳐져 있습니다.
 */
export function EtiquetteItem({ number, title, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li className="md:flex md:gap-3 md:px-5 md:py-4">
      {/* 모바일: 누르면 펼쳐지는 제목 버튼 */}
      <h3 className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600"
        >
          <span aria-hidden="true" className={`flex ${badge}`}>
            {number}
          </span>
          <span className="min-w-0 flex-1 py-0.5 font-bold break-keep text-brand-950">{title}</span>
          <ChevronDownIcon
            className={`mt-1 size-5 shrink-0 text-brand-600 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h3>

      {/* md 이상: 버튼 없이 항상 펼쳐진 번호와 제목 */}
      <span aria-hidden="true" className={`mt-0.5 hidden md:flex ${badge}`}>
        {number}
      </span>
      <div className="min-w-0">
        <h3 className="hidden font-bold break-keep text-brand-950 md:block">{title}</h3>
        {/* 모바일에서는 설명을 제목 글자에 맞춰 들여 씁니다 (번호 동그라미 너비만큼) */}
        <div
          id={panelId}
          className={`-mt-3 pr-5 pb-4 pl-15 md:mt-0 md:block md:p-0 ${open ? "" : "hidden"}`}
        >
          {children}
        </div>
      </div>
    </li>
  );
}
