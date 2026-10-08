"use client";

import Link from "next/link";
import { useState } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { HiddenToggle } from "@/components/admin/HiddenControls";
import { PencilIcon, SearchIcon } from "@/components/icons";

/** 관리자 목록의 한 줄 (대회·앨범·소식이 같은 모양을 씁니다) */
export type AdminListItem = {
  id: string;
  title: string;
  /** 제목 위에 작게 보이는 글 (날짜, 사진 수, 출처 등) */
  meta: string;
  /** 대회의 "D-12"·"종료" 같은 표시. muted 면 흐리게 보여 줍니다. */
  status?: { label: string; muted: boolean };
  hidden: boolean;
  /** 목록을 묶는 연도 */
  year: number;
  /** 제목 말고도 검색에 걸리게 할 글 (영어 제목, 장소, 출처 등) */
  keywords?: string;
  /** 이 줄이 걸리는 필터의 key 들 */
  filters: string[];
  /** 방문자용 페이지 주소 */
  viewHref: string;
  /** 수정 화면 주소 */
  editHref: string;
  /** 삭제 전에 한 번 더 물어볼 문구 */
  deleteMessage: string;
};

type Props = {
  items: AdminListItem[];
  /** '전체' 뒤에 나란히 놓을 필터 */
  filters: { key: string; label: string }[];
  searchPlaceholder: string;
  /** 등록된 것이 하나도 없을 때 보여 줄 안내 */
  emptyMessage: string;
  setHiddenAction: (id: string, hidden: boolean) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
};

const ALL = "all";

const editLinkClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700";

/** 띄어쓰기나 대소문자가 달라도 찾아지도록 검색어와 글을 같은 모양으로 맞춥니다. */
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, "");

/** 검색·필터로 원하는 글을 찾고, 연도별로 묶어 보여 주는 관리자 목록 */
export function AdminList({
  items,
  filters,
  searchPlaceholder,
  emptyMessage,
  setHiddenAction,
  deleteAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL);

  if (items.length === 0) {
    return <p className="card px-6 py-10 text-center break-keep text-slate-500">{emptyMessage}</p>;
  }

  const needle = normalize(query);
  const searched = needle
    ? items.filter((item) => normalize(`${item.title} ${item.keywords ?? ""}`).includes(needle))
    : items;
  const shown =
    filter === ALL ? searched : searched.filter((item) => item.filters.includes(filter));

  const byYear = new Map<number, AdminListItem[]>();
  for (const item of shown) {
    byYear.set(item.year, [...(byYear.get(item.year) ?? []), item]);
  }

  // 필터 옆의 건수는 검색어에 맞는 글 가운데 몇 건인지입니다.
  const chips = [
    { key: ALL, label: "전체", count: searched.length },
    ...filters.map((item) => ({
      ...item,
      count: searched.filter((row) => row.filters.includes(item.key)).length,
    })),
  ];

  return (
    <div>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="field pl-11"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = chip.key === filter;
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(chip.key)}
              className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 transition-colors ${
                active
                  ? "bg-brand-100 text-brand-800 ring-brand-300"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {chip.label}{" "}
              <span className={active ? "text-brand-600" : "text-slate-400"}>{chip.count}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="card mt-5 px-6 py-10 text-center text-slate-500">
          <p>조건에 맞는 글이 없습니다.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter(ALL);
            }}
            className="mt-3 text-sm font-bold text-brand-700 underline underline-offset-2"
          >
            조건 지우기
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {[...byYear.entries()].map(([year, rows]) => (
            <section key={year} aria-label={`${year}년`}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-700">
                {year}년<span className="font-semibold text-slate-400">{rows.length}</span>
                <span className="h-px flex-1 bg-brand-100" />
              </h3>
              <ul className="card divide-y divide-slate-100">
                {rows.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
                  >
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        {item.status && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                              item.status.muted
                                ? "bg-slate-100 text-slate-500"
                                : "bg-brand-700 text-white"
                            }`}
                          >
                            {item.status.label}
                          </span>
                        )}
                        {item.hidden && (
                          <span className="rounded-full bg-accent-50 px-2 py-0.5 text-xs font-bold text-accent-700 ring-1 ring-accent-200">
                            숨김
                          </span>
                        )}
                        {item.meta}
                      </p>
                      {/* 숨긴 글은 방문자용 페이지가 없으므로 수정 화면으로 보냅니다. */}
                      <Link
                        href={item.hidden ? item.editHref : item.viewHref}
                        className="mt-1 block truncate font-bold text-slate-900 hover:text-brand-700"
                      >
                        {item.title}
                      </Link>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link href={item.editHref} className={editLinkClass}>
                        <PencilIcon className="size-4" />
                        수정
                      </Link>
                      <HiddenToggle
                        hidden={item.hidden}
                        action={(hidden) => setHiddenAction(item.id, hidden)}
                      />
                      <DeleteButton
                        action={() => deleteAction(item.id)}
                        confirmMessage={item.deleteMessage}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
