"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDownIcon } from "@/components/icons";

type Props = {
  name: string;
  subtitle?: string;
  /** 시간·주소·연락처 등 펼쳤을 때 보이는 내용 */
  children: ReactNode;
};

/**
 * 탁구 장소 카드.
 * 모바일에서는 이름만 보이고 누르면 정보가 펼쳐집니다. 두 칸으로 나뉘는 md 이상에서는 항상 펼쳐져 있습니다.
 */
export function VenueCard({ name, subtitle, children }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <li className="card md:p-7">
      {/* 모바일: 누르면 펼쳐지는 제목 버튼 */}
      <h2 className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 rounded-2xl p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-xl font-black break-keep text-brand-950">{name}</span>
            {subtitle && (
              <span className="mt-1 block text-sm font-normal break-keep text-slate-500">
                {subtitle}
              </span>
            )}
          </span>
          <ChevronDownIcon
            className={`mt-1 size-5 shrink-0 text-brand-600 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </h2>

      {/* md 이상: 버튼 없이 항상 펼쳐진 제목 */}
      <div className="hidden md:block">
        <h2 className="text-xl font-black break-keep text-brand-950">{name}</h2>
        {subtitle && <p className="mt-1 text-sm break-keep text-slate-500">{subtitle}</p>}
      </div>

      <div
        id={panelId}
        className={`border-t border-slate-100 px-5 pt-4 pb-5 md:mt-5 md:block md:border-0 md:p-0 ${
          open ? "" : "hidden"
        }`}
      >
        {children}
      </div>
    </li>
  );
}
