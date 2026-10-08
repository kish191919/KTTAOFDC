import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizeNewsPost } from "@/lib/i18n/localize";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { newsSummary } from "@/lib/news";
import { getNewsPost, listNewsPosts } from "@/lib/store/news";
import { AttachmentList } from "@/components/AttachmentList";
import { ImageViewer } from "@/components/ImageViewer";
import { LinkedText } from "@/components/LinkedText";
import { NewsMeta } from "@/components/NewsCard";
import { ArrowLeftIcon, ExternalLinkIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string; id: string }> };

// 저장하면 바로 새로 만들어지지만, 이 사이트 밖(내 컴퓨터·스크립트)에서 고친 내용도
// 반영되도록 한 시간마다 새로 만듭니다.
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await listNewsPosts()).map((post) => ({ id: post.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const { id } = await params;
  const stored = await getNewsPost(id);
  if (!stored) return { title: getDictionary(lang).community.news };

  const post = localizeNewsPost(stored, lang);
  return pageMetadata({
    lang,
    path: `/community/news/${post.id}`,
    title: post.title,
    description: newsSummary(post, lang),
    image: post.images[0],
  });
}

export default async function NewsPostPage({ params }: Props) {
  const lang = await readLang(params);
  const { id } = await params;
  const stored = await getNewsPost(id);
  if (!stored) notFound();

  const d = getDictionary(lang);
  const t = d.news;
  const post = localizeNewsPost(stored, lang);

  return (
    // 글을 읽는 화면이라 한 줄이 너무 길어지지 않게 다른 페이지보다 폭을 좁게 잡습니다.
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <Link
        href={localePath(lang, "/community/news")}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4" />
        {d.community.news}
      </Link>

      <header className="mt-5 border-b border-brand-100 pb-8">
        <NewsMeta post={post} lang={lang} />
        <h1 className="mt-3 text-3xl leading-tight font-black break-keep text-brand-950 md:text-4xl">
          {post.title}
        </h1>
      </header>

      <div className="mt-10 space-y-10">
        {/* 신문 기사처럼 사진을 먼저 보여 주고 그 아래에 글을 싣습니다. */}
        {post.images.length > 0 && <ImageViewer images={post.images} label={post.title} lang={lang} />}

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
            {post.source ? t.original : t.openLink}
            <ExternalLinkIcon className="size-4" />
          </a>
        )}

        {post.attachments.length > 0 && (
          <section aria-labelledby="files-heading">
            <h2 id="files-heading" className="mb-4 text-xl font-black text-brand-950">
              {t.attachments}
            </h2>
            <AttachmentList files={post.attachments} />
          </section>
        )}
      </div>

      <div className="mt-14 border-t border-brand-100 pt-8 text-center">
        <Link href={localePath(lang, "/community/news")} className="btn btn-outline">
          <ArrowLeftIcon className="size-4" />
          {t.more}
        </Link>
      </div>
    </article>
  );
}
