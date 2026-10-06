import { notFound } from "next/navigation";

// 어느 페이지에도 해당하지 않는 주소를 받아, 그 언어의 화면 틀 안에서
// '페이지를 찾을 수 없습니다'(app/[lang]/not-found.tsx)를 보여 줍니다.
export default function UnknownPage() {
  notFound();
}
