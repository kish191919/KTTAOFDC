import { isAdmin } from "@/lib/auth";
import {
  saveUpload,
  UPLOAD_FOLDERS,
  UploadError,
  type UploadFolder,
} from "@/lib/store/files";
import { STORE_WRITABLE } from "@/lib/store/json-file";

// 관리자 화면에서 포스터·사진·첨부 파일을 한 개씩 올리는 주소입니다.

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
  if (!STORE_WRITABLE) return fail("이 서버에서는 파일을 올릴 수 없습니다.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("요청 형식이 올바르지 않습니다.", 400);
  }

  const file = form.get("file");
  const folder = form.get("folder");
  const kind = form.get("kind");
  if (!(file instanceof File)) return fail("파일이 없습니다.", 400);
  if (
    typeof folder !== "string" ||
    !UPLOAD_FOLDERS.includes(folder as UploadFolder)
  ) {
    return fail("저장 위치가 올바르지 않습니다.", 400);
  }
  if (kind !== "image" && kind !== "document") {
    return fail("파일 종류가 올바르지 않습니다.", 400);
  }

  try {
    return Response.json(await saveUpload(folder as UploadFolder, file, kind));
  } catch (error) {
    if (error instanceof UploadError) return fail(error.message, 400);
    throw error;
  }
}
