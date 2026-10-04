import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
};

/** 각 페이지 맨 위의 제목 영역 */
export function PageHeader({ eyebrow, title, description, children }: Props) {
  return (
    <section className="border-b border-brand-100/70 bg-linear-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-4xl px-4 pt-16 pb-12 text-center">
        <span className="eyebrow mb-4">{eyebrow}</span>
        <h1 className="text-4xl leading-tight font-black text-brand-950 md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed break-keep text-slate-600">
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
};

/** 섹션 가운데 정렬 제목 (영문 소제목 + 큰 제목 + 설명) */
export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-12 text-center">
      <span className="eyebrow mb-3">{eyebrow}</span>
      <h2 className="text-3xl font-bold text-brand-950 md:text-4xl">{title}</h2>
      {description && (
        <p className="mx-auto mt-4 max-w-2xl text-lg break-keep text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}
