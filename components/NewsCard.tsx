import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { formatDate } from "@/lib/dates";
import { excerptOf } from "@/lib/news";

/** 날짜와, 신문 기사라면 실린 곳을 나란히 보여 줍니다. */
export function NewsMeta({ post }: { post: Pick<NewsPost, "date" | "source"> }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm font-semibold text-accent-600">
      {formatDate(post.date)}
      {post.source && (
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
          {post.source}
        </span>
      )}
    </p>
  );
}

export function NewsCard({ post }: { post: NewsPost }) {
  const cover = post.images[0];
  const excerpt = excerptOf(post);
  return (
    <Link
      href={`/community/news/${post.id}`}
      className="group card flex items-start gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg sm:gap-6 sm:p-5"
    >
      <div className="min-w-0 flex-1">
        <NewsMeta post={post} />
        <h2 className="mt-1.5 line-clamp-2 text-lg leading-snug font-bold break-keep text-slate-900 transition-colors group-hover:text-brand-700 sm:text-xl">
          {post.title}
        </h2>
        {excerpt && (
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed wrap-anywhere break-keep text-slate-600">
            {excerpt}
          </p>
        )}
      </div>
      {cover && (
        // 신문 기사는 제목이 위쪽에 있으므로 위쪽을 기준으로 잘라 보여 줍니다.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.src}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-20 shrink-0 rounded-xl border border-slate-200 object-cover object-top sm:h-28 sm:w-40"
        />
      )}
    </Link>
  );
}
