@AGENTS.md

# KTTA of DC 홈페이지

워싱턴DC 한인탁구협회 사이트. 구성과 운영 방법은 README.md 참고.

- 코드 주석은 한국어로 씁니다.
- 한국어(`/…`)와 영어(`/en/…`) 두 언어로 보여 줍니다. 페이지는 모두 `app/[lang]/` 아래에 있고, 주소 규칙은 `proxy.ts` 에 있습니다.
  - 화면 문구는 컴포넌트에 직접 적지 않고 `lib/i18n/dictionaries/` 의 `ko.ts`·`en.ts` 에 함께 넣습니다. 고정 글(`lib/content/`)은 `{ ko, en }` 으로 나란히 적습니다.
  - 내부 링크는 `localePath(lang, "/…")` 로 만들고, 관리자가 올린 글은 `lib/i18n/localize.ts` 를 거쳐 보여 줍니다.
  - 주소를 읽는 클라이언트 코드는 `stripLocale(usePathname())` 을 씁니다. (서버는 `/ko/about`, 주소창은 `/about` 이라 그대로 쓰면 어긋납니다)
  - 언어가 바뀌는 링크(전환 버튼, 관리자)는 `Link` 가 아닌 일반 링크로 문서를 새로 엽니다. (`components/LangToggle.tsx`, `AdminLink.tsx`)
  - 영어는 번역투가 아니라 짧고 정중한 문장으로 쓰고, 단체 이름은 포스터·로고에 적힌 공식 영문 표기를 따릅니다.
- 데이터베이스 없이 `data/*.json` 과 `public/uploads/` 에 저장합니다. 읽기·쓰기는 반드시 `lib/store/` 의 함수를 거칩니다 (나중에 데이터베이스로 교체할 자리).
- 저장·삭제는 `lib/actions.ts` 의 서버 액션, 파일 업로드는 `app/api/admin/upload` 가 담당하며 둘 다 관리자 로그인(`lib/auth.ts`)을 확인합니다.
- 색상은 `app/globals.css` 의 `brand`(로고 파랑) · `accent`(로고 빨강) · `navy` 토큰만 사용합니다.
- 수정 후 확인: `npx tsc --noEmit && npx eslint . && npm run build`
  (페이지 파일을 옮기거나 더했다면 먼저 `npx next typegen`. `npm run dev` 가 켜져 있는 동안 옮겼다면 dev 서버를 다시 시작해야 `.next/dev/types` 의 예전 경로가 지워집니다)
