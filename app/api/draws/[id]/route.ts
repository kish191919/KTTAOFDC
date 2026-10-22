import { isAdmin } from "@/lib/auth";
import { today } from "@/lib/dates";
import { drawPayload } from "@/lib/draw/view";
import { getDraw } from "@/lib/store/draws";
import { getTournament } from "@/lib/store/tournaments";

// 실시간 대진표 화면이 마감 전까지 5초마다 새 결과를 받아 가는 주소입니다.
// 공개된 대회는 Vercel 이 같은 응답을 2초 동안 여러 사람에게 나눠 주므로,
// 대회장에서 많은 사람이 화면을 열어 두어도 Supabase 는 2초에 한 번 정도만 읽습니다.
// 숨긴 대회는 관리자에게만 보여 주고 나눠 주지 않습니다.

const notFound = () =>
  Response.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, context: RouteContext<"/api/draws/[id]">) {
  const { id } = await context.params;
  const [draw, tournament] = await Promise.all([
    getDraw(id),
    getTournament(id, { includeHidden: true }),
  ]);
  if (!draw || !tournament) return notFound();
  if (tournament.hidden && !(await isAdmin())) return notFound();

  return Response.json(drawPayload(draw, tournament, today()), {
    headers: tournament.hidden
      ? { "Cache-Control": "private, no-store" }
      : {
          "Cache-Control": "public, max-age=0, must-revalidate",
          "CDN-Cache-Control": "max-age=2",
        },
  });
}
