import "server-only";
import { PostgrestClient } from "@supabase/postgrest-js";
import { StorageClient } from "@supabase/storage-js";

// Supabase 연결. 주소와 secret key 는 .env.local (배포된 사이트는 Vercel 환경 변수)에 둡니다.
// secret key 로는 모든 내용을 읽고 쓸 수 있으므로 서버에서만 쓰고 브라우저로 내보내지 않습니다.
//
// 로그인·실시간 기능은 쓰지 않으므로 통합 라이브러리(@supabase/supabase-js) 대신
// 테이블용·파일용 라이브러리 두 개만 씁니다. (통합 라이브러리는 Node 22 미만에서 켜지지 않습니다)

/** 사진·동영상·첨부 파일을 담는 공개 버킷 (supabase/schema.sql) */
const BUCKET = "uploads";

function env(name: "SUPABASE_URL" | "SUPABASE_SECRET_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} 가 설정되지 않았습니다. .env.local (배포된 사이트는 Vercel 환경 변수)에 Supabase 프로젝트의 값을 넣어 주세요.`,
    );
  }
  return value;
}

const projectUrl = () => env("SUPABASE_URL").replace(/\/+$/, "");

function headers(): Record<string, string> {
  const key = env("SUPABASE_SECRET_KEY");
  return { apikey: key, Authorization: `Bearer ${key}` };
}

let tables: PostgrestClient | undefined;
let files: StorageClient | undefined;

/** 글 내용을 담는 테이블에 접근합니다. */
export function database(): PostgrestClient {
  tables ??= new PostgrestClient(`${projectUrl()}/rest/v1`, { headers: headers() });
  return tables;
}

/** 올린 파일을 담는 버킷에 접근합니다. */
export function bucket() {
  files ??= new StorageClient(`${projectUrl()}/storage/v1`, headers());
  return files.from(BUCKET);
}

/** 버킷에 올린 파일이 열리는 주소의 앞부분 ("https://….supabase.co/storage/v1/object/public/uploads/") */
export function publicBase(): string {
  return `${projectUrl()}/storage/v1/object/public/${BUCKET}/`;
}
