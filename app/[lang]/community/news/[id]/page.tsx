import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import { newsSummary } from "@/lib/news";
import { getNewsPost, listNewsPosts } from "@/lib/store/news";
import { AttachmentList } from "@/components/AttachmentList";
import { ImageViewer } from "@/components/ImageViewer";
import { LinkedText } from "@/components/LinkedText";
import { NewsMeta } from "@/components/NewsCard";
import { ArrowLeftIcon, ExternalLinkIcon } from "@/components/icons";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await listNewsPosts()).map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getNewsPost(id);
  if (!post) return { title: "탁구 소식" };

  return pageMetadata({
    title: post.title,
    description: newsSummary(post),
    image: post.images[0],
  });
}

export default async function NewsPostPage({ params }: Props) {
  const { id } = await params;
  const post = await getNewsPost(id);
  if (!post) notFound();

  return (
    // 글을 읽는 화면이라 한 줄이 너무 길어지지 않게 다른 페이지보다 폭을 좁게 잡습니다.
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href="/community/news"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        탁구 소식
      </Link>

      <header className="mt-5 border-b border-brand-100 pb-8">
        <NewsMeta post={post} />
        <h1 className="mt-3 text-3xl leading-tight font-black break-keep text-brand-950 md:text-4xl">
          {post.title}
        </h1>
      </header>

      <div className="mt-10 space-y-10">
        {/* 신문 기사처럼 사진을 먼저 보여 주고 그 아래에 글을 싣습니다. */}
        {post.images.length > 0 && <ImageViewer images={post.images} label={post.title} />}

        {post.body && (
          <LinkedText
            text={post.body}
            className="text-base leading-8 break-keep text-slate-700 md:text-[17px] md:leading-9"
          />
        )}

        {post.linkUrl && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent w-full sm:w-auto"
          >
            {post.source ? "기사 원문 보기" : "관련 링크 열기"}
            <ExternalLinkIcon className="size-4" />
          </a>
        )}

        {post.attachments.length > 0 && (
          <section aria-labelledby="files-heading">
            <h2 id="files-heading" className="mb-4 text-xl font-black text-brand-950">
              첨부 파일
            </h2>
            <AttachmentList files={post.attachments} />
          </section>
        )}
      </div>

      <div className="mt-14 border-t border-brand-100 pt-8 text-center">
        <Link href="/community/news" className="btn btn-outline">
          <ArrowLeftIcon className="size-4" />
          다른 소식 보기
        </Link>
      </div>
    </article>
  );
}
