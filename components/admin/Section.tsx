import type { ReactNode } from "react";

/** 입력 화면을 제목이 달린 카드 하나씩으로 나누는 구역 */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-6 md:p-7">
      <h2 className="text-lg font-black text-brand-950">{title}</h2>
      {description && (
        <p className="mt-1 text-sm break-keep text-slate-500">{description}</p>
      )}
      <div className="space-y-5 pt-5">{children}</div>
    </section>
  );
}
