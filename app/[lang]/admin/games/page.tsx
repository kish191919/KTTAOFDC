import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { dateOf, formatDate, today } from "@/lib/dates";
import { isGameOpen } from "@/lib/games/play";
import { listAllGames, listPeople } from "@/lib/store/games";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { GamesAdmin } from "@/components/admin/GamesAdmin";
import { ExternalLinkIcon } from "@/components/icons";

/** 번개 게임 관리: 누구나 만든 게임과 저장된 이름 가운데 장난이나 잘못 들어간 것을 지웁니다. */
export default async function AdminGamesPage() {
  await requireAdmin();
  const [games, people] = await Promise.all([listAllGames(), listPeople()]);
  const now = today();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <AdminHeader current="/admin/games" />

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-3xl break-keep text-slate-600">
          번개 게임은 로그인 없이 누구나 만들고 기록합니다. 장난으로 만든 게임이나 잘못 들어간 이름을 여기서 지웁니다.
          관리자로 로그인한 채 게임 화면을 열면 맨 아래 <strong>게임 관리</strong>에서 이름·참가자를 고치거나 마감할 수 있습니다.
        </p>
        <Link href="/games" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          방문자 화면
          <ExternalLinkIcon className="size-4" />
        </Link>
      </div>

      <div className="mt-8">
        <GamesAdmin
          games={games.map((game) => ({
            id: game.id,
            title: game.title,
            format: game.format,
            date: formatDate(dateOf(game.createdAt)),
            players: game.players.length,
            matches: game.matches.length,
            open: isGameOpen(game, now),
          }))}
          people={people}
        />
      </div>
    </div>
  );
}
