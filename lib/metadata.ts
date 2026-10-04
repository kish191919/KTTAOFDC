import type { Metadata } from "next";
import { site } from "@/lib/site";
import type { ImageRef } from "@/lib/types";

/** 카카오톡·SNS 에 링크를 붙였을 때 보이는 미리보기의 공통 정보 */
export const sharedOpenGraph = {
  type: "website",
  locale: "ko_KR",
  siteName: site.name,
} as const;

// 대표 이미지가 없는 페이지는 사이트 배너(app/opengraph-image.jpg)를 미리보기로 씁니다.
const DEFAULT_IMAGE = { url: "/opengraph-image.jpg", width: 1200, height: 630 };

/** 페이지 제목·설명과 링크 미리보기 정보를 한 번에 만듭니다. */
export function pageMetadata({
  title,
  description,
  image,
}: {
  title: string;
  description: string;
  image?: ImageRef;
}): Metadata {
  const preview = image
    ? {
        url: image.src,
        ...(image.width && image.height
          ? { width: image.width, height: image.height }
          : {}),
      }
    : DEFAULT_IMAGE;
  return {
    title,
    description,
    openGraph: {
      ...sharedOpenGraph,
      title: `${title} | ${site.name}`,
      description,
      images: [preview],
    },
  };
}
