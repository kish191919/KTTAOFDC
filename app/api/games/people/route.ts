import { listPeople } from "@/lib/store/games";

// 친선 경기에 한 번이라도 쓴 이름 (최근에 쓴 순서). 참가자를 넣을 때 찾아 고르는 목록입니다.
// 자주 바뀌지 않으므로 Vercel 이 30초 동안 같은 응답을 나눠 줍니다.

/** 한 번에 보내는 이름 수. 그보다 오래전에 쓴 이름은 새 이름처럼 적으면 같은 사람으로 이어집니다. */
const LIMIT = 2000;

export async function GET() {
  const people = await listPeople();
  return Response.json(
    { names: people.slice(0, LIMIT).map((person) => person.name) },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "max-age=30",
      },
    },
  );
}
