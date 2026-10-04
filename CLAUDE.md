@AGENTS.md

# KTTA of DC 홈페이지

버지니아 한인 탁구 협회 사이트. 구성과 운영 방법은 README.md 참고.

- 화면 문구와 코드 주석은 한국어로 씁니다.
- 데이터베이스 없이 `data/*.json` 과 `public/uploads/` 에 저장합니다. 읽기·쓰기는 반드시 `lib/store/` 의 함수를 거칩니다 (나중에 데이터베이스로 교체할 자리).
- 저장·삭제는 `lib/actions.ts` 의 서버 액션, 파일 업로드는 `app/api/admin/upload` 가 담당하며 둘 다 관리자 로그인(`lib/auth.ts`)을 확인합니다.
- 색상은 `app/globals.css` 의 `brand`(로고 파랑) · `accent`(로고 빨강) · `navy` 토큰만 사용합니다.
- 수정 후 확인: `npx tsc --noEmit && npx eslint . && npm run build`
