import { isAdmin } from "@/lib/auth";
import {
  createUpload,
  UPLOAD_FOLDERS,
  UploadError,
  type UploadFolder,
} from "@/lib/store/files";

// 관리자 화면에서 포스터·사진·첨부 파일·메인 화면 동영상을 올릴 때 먼저 부르는 주소입니다.
// 파일 자체는 받지 않습니다. 로그인과 파일 종류·크기를 확인한 뒤,
// 브라우저가 Supabase 로 파일을 바로 보낼 수 있는 일회용 주소를 돌려줍니다.

const fail = (error: string, status: number) => Response.json({ error }, { status });

/** 다른 사이트에서 보낸 요청인지 확인합니다. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("허용되지 않은 요청입니다.", 403);
  if (!(await isAdmin())) return fail("로그인이 필요합니다.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.", 400);
  }

  const { folder, kind, name, size } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || !name || typeof size !== "number") {
    return fail("파일이 없습니다.", 400);
  }
  if (
    typeof folder !== "string" ||
    !UPLOAD_FOLDERS.includes(folder as UploadFolder)
  ) {
    return fail("저장 위치가 올바르지 않습니다.", 400);
  }
  if (kind !== "image" && kind !== "document" && kind !== "video") {
    return fail("파일 종류가 올바르지 않습니다.", 400);
  }

  try {
    return Response.json(await createUpload(folder as UploadFolder, kind, name, size));
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message, 400);
    throw error;
  }
}
