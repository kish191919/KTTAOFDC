import { today } from "@/lib/dates";
import { isGameOpen, publicGame, type GamePayload } from "@/lib/games/play";
import { getGame } from "@/lib/store/games";

// 번개 게임 화면이 5초마다 새 결과를 받아 가는 주소입니다.
// 실시간 대진표처럼 Vercel 이 같은 응답을 2초 동안 여러 사람에게 나눠 주어 Supabase 를 덜 읽습니다.

export async function GET(_request: Request, context: RouteContext<"/api/games/[id]">) {
  const { id } = await context.params;
  const game = await getGame(id);
  if (!game) {
    return Response.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const payload: GamePayload = { game: publicGame(game), open: isGameOpen(game, today()) };
  return Response.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "CDN-Cache-Control": "max-age=2",
    },
  });
}
