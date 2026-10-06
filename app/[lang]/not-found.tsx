import { getDictionary } from "@/lib/i18n/dictionaries";
import { NotFoundContent } from "@/components/NotFoundContent";

// not-found 는 주소 정보(params)를 받지 못합니다. 그래서 두 언어의 문구를 모두 넘기고,
// 화면 쪽(NotFoundContent)에서 주소가 /en 으로 시작하는지 보고 고릅니다.
export default function NotFound() {
  return (
    <NotFoundContent ko={getDictionary("ko").notFound} en={getDictionary("en").notFound} />
  );
}
