import { redirect } from "next/navigation";
import { isAdmin, isAdminConfigured } from "@/lib/auth";
import { site } from "@/lib/site";
import { LoginForm } from "@/components/admin/LoginForm";
import { LockIcon } from "@/components/icons";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <LockIcon className="size-5" />
          </div>
          <h1 className="text-xl font-bold text-brand-950">관리자 로그인</h1>
          <p className="mt-1 text-sm text-slate-500">{site.nameKo} 홈페이지 관리</p>
        </div>

        {isAdminConfigured() ? (
          <LoginForm />
        ) : (
          <div className="rounded-xl bg-accent-50 p-4 text-sm leading-relaxed break-keep text-accent-700">
            <p className="font-bold">관리자 비밀번호가 아직 설정되지 않았습니다.</p>
            <p className="mt-2">
              프로젝트 폴더의 <code className="font-mono font-semibold">.env.local</code>{" "}
              파일에 아래 한 줄을 추가하고 서버를 다시 시작해 주세요. 배포된 사이트는 Vercel 의
              Environment Variables 에 같은 값을 넣고 다시 배포합니다.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-white p-3 font-mono text-xs text-slate-800">
              ADMIN_PASSWORD=원하는비밀번호
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
