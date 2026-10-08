import type { Album, ImageRef } from "@/lib/types";

/** 앨범 표지. 첫 번째 사진이고, 사진이 없으면 첫 동영상의 대표 화면입니다. */
export function albumCover(album: Pick<Album, "photos" | "videos">): ImageRef | undefined {
  if (album.photos[0]) return album.photos[0];
  const poster = album.videos?.find((video) => video.poster)?.poster;
  return poster ? { src: poster } : undefined;
}
