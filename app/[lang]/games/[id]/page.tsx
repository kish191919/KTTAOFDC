import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { today } from "@/lib/dates";
import { isGameOpen, publicGame } from "@/lib/games/play";
import { localePath } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { readLang } from "@/lib/i18n/params";
import { pageMetadata } from "@/lib/metadata";
import { getGame } from "@/lib/store/games";
import { GameBoard } from "@/components/games/GameBoard";
import { ArrowLeftIcon } from "@/components/icons";

type Props = { params: Promise<{ lang: string; id: string }> };

// 경기 결과가 계속 바뀌므로 미리 만들어 두지 않고 열 때마다 새로 그립니다.
// 그 뒤로는 화면이 5초마다 app/api/games/[id] 에서 새 결과를 받아 옵니다.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lang = await readLang(params);
  const { id } = await params;
  const t = getDictionary(lang).games;
  const game = await getGame(id);
  if (!game) return { title: t.title, robots: { index: false } };
  // 카카오톡 등으로 링크를 보냈을 때 게임 이름과 방식이 미리보기에 나옵니다.
  return {
    ...pageMetadata({
      lang,
      path: `/games/${id}`,
      title: `${game.title} · ${t.title}`,
      description: `${t.format[game.format]} · ${t.people(game.players.length)} · ${t.shareText(game.title)}`,
    }),
    robots: { index: false },
  };
}

export default async function GamePage({ params }: Props) {
  const lang = await readLang(params);
  const { id } = await params;
  const [game, admin] = await Promise.all([getGame(id), isAdmin()]);
  if (!game) notFound();
  const t = getDictionary(lang).games;

  return (
    // 휴대폰에서는 위쪽 여백을 줄여, 첫 화면에 순위표가 조금이라도 더 보이게 합니다.
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-10 md:py-12">
      <Link
        href={localePath(lang, "/games")}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-brand-700 md:mb-4"
      >
        <ArrowLeftIcon className="size-4" />
        {t.back}
      </Link>
      <GameBoard
        lang={lang}
        initial={{ game: publicGame(game), open: isGameOpen(game, today()) }}
        admin={admin}
        renderedAt={new Date().toISOString()}
      />
    </div>
  );
}
