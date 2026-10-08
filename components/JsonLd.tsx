/**
 * 검색 사이트가 읽는 구조화 데이터(JSON-LD)를 페이지에 넣습니다. 화면에는 보이지 않습니다.
 * 내용은 `lib/structured-data.ts` 에서 만듭니다.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // 관리자가 적은 글에 "<" 가 있어도 태그로 읽히지 않도록 바꿔 넣습니다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
