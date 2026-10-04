import { promises as fs } from "node:fs";
import { contentTypeFor, resolveUpload } from "@/lib/store/files";

// public/uploads 의 파일은 보통 Next.js 가 직접 내보냅니다.
// 다만 `npm start`(빌드 후 실행) 중에 새로 올린 파일은 빌드 때 없던 파일이라
// 직접 내보내지 못하므로, 그런 경우에만 이 경로가 대신 파일을 읽어 응답합니다.

type Context = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Context) {
  const { path: segments } = await params;
  const file = resolveUpload(`/uploads/${segments.join("/")}`);
  const type = file ? contentTypeFor(file) : null;
  if (!file || !type) return new Response("Not found", { status: 404 });

  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
