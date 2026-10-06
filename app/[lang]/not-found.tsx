import Link from "next/link";
import { PaddleMark } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <PaddleMark className="size-20" />
      <h1 className="mt-6 text-3xl font-black text-brand-950">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 break-keep text-slate-600">
        주소가 바뀌었거나 삭제된 페이지입니다. 아래 버튼으로 이동해 주세요.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-brand">
          홈으로
        </Link>
        <Link href="/tournaments" className="btn btn-outline">
          대회 정보 보기
        </Link>
      </div>
    </div>
  );
}
