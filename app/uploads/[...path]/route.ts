import { createReadStream, promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { contentTypeFor, resolveUpload } from "@/lib/store/files";

// public/uploads 의 파일은 보통 Next.js 가 직접 내보냅니다.
// 다만 `npm start`(빌드 후 실행) 중에 새로 올린 파일은 빌드 때 없던 파일이라
// 직접 내보내지 못하므로, 그런 경우에만 이 경로가 대신 파일을 읽어 응답합니다.

type Context = { params: Promise<{ path: string[] }> };

const notFound = () => new Response("Not found", { status: 404 });

/**
 * "bytes=0-1023" 같은 Range 요청을 읽습니다.
 * Range 가 없으면 null, 파일 범위를 벗어났으면 "invalid" 를 돌려줍니다.
 */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  // 여러 구간을 한꺼번에 달라는 요청 등은 전체 파일로 응답합니다.
  if (!match || (!match[1] && !match[2])) return null;

  // "bytes=-500" 은 마지막 500바이트라는 뜻입니다.
  if (!match[1]) {
    const length = Number(match[2]);
    if (length === 0) return "invalid";
    return { start: Math.max(0, size - length), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

export async function GET(request: Request, { params }: Context) {
  const { path: segments } = await params;
  const file = resolveUpload(`/uploads/${segments.join("/")}`);
  const type = file ? contentTypeFor(file) : null;
  if (!file || !type) return notFound();

  let size: number;
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return notFound();
    size = stat.size;
  } catch {
    return notFound();
  }

  const headers: Record<string, string> = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    // 동영상은 브라우저(특히 iPhone 의 Safari)가 필요한 구간만 나눠서 요청합니다.
    "Accept-Ranges": "bytes",
  };
  if (size === 0) return new Response(null, { headers });

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${size}` },
    });
  }

  const { start, end } = range ?? { start: 0, end: size - 1 };
  headers["Content-Length"] = String(end - start + 1);
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;

  // 큰 동영상도 메모리에 통째로 올리지 않도록 조금씩 읽어서 내보냅니다.
  const stream = Readable.toWeb(createReadStream(file, { start, end }));
  return new Response(stream as unknown as ReadableStream<Uint8Array>, {
    status: range ? 206 : 200,
    headers,
  });
}
