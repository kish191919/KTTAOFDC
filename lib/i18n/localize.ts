import type { Album, NewsPost, Tournament } from "@/lib/types";
import type { Locale } from "./config";

// 관리자가 올린 글(대회·소식·앨범)을 보여 줄 언어에 맞게 바꿉니다.
// 영어 화면이면 `en` 에 적어 둔 글로 덮어쓰고, 비어 있는 칸은 한국어 글을 그대로 둡니다.

function withEnglish<T extends { en?: Partial<T> }>(item: T, lang: Locale): T {
  if (lang !== "en" || !item.en) return item;
  const filled = Object.fromEntries(
    Object.entries(item.en).filter(([, value]) => Boolean(value)),
  );
  return { ...item, ...filled };
}

export const localizeTournament = (tournament: Tournament, lang: Locale): Tournament =>
  withEnglish(tournament, lang);

export const localizeNewsPost = (post: NewsPost, lang: Locale): NewsPost =>
  withEnglish(post, lang);

export const localizeAlbum = (album: Album, lang: Locale): Album => withEnglish(album, lang);
