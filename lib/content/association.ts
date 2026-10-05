// 협회 소개 페이지 내용 — 기존 홈페이지(kttava.org)의 글을 옮겨 왔습니다.

export const greeting = {
  welcome: "워싱턴DC 한인탁구협회 홈페이지를 방문해 주셔서 감사합니다.",
  paragraphs: [
    "안녕하세요, 워싱턴DC 한인탁구협회 회장입니다.",
    "탁구는 도전과 성취, 그리고 협력의 가치를 동시에 담고 있는 스포츠입니다.",
    "우리 협회는 탁구의 발전과 대중화를 위해 지속적으로 노력하고 있으며, 모든 탁구인들이 함께 성장할 수 있는 환경을 제공하기 위해 힘쓰고 있습니다.",
    "이 홈페이지를 통해 다양한 소식과 정보를 접하시고, 탁구에 대한 관심과 참여가 더욱 확장되기를 바랍니다. 탁구로 하나 되어 만들어갈 더 밝은 미래를 여러분과 함께 꿈꿉니다.",
    "감사합니다.",
  ],
  signature: "워싱턴DC 한인탁구협회장 Jason Choi",
  // 홈 화면과 협회 소개의 인사말 옆에 놓는 협회장 사진. 사진을 바꾸면 가로·세로 크기도 함께 고칩니다.
  photo: { src: "/images/president.jpg", width: 1184, height: 1504 },
};

export const about = {
  lead: "워싱턴DC 한인탁구협회는",
  body: "탁구를 사랑하는 열정적인 사람들로 구성된 활기찬 커뮤니티입니다. 협회는 버지니아 주 전역에서 탁구의 발전과 저변 확대를 위해 헌신하고 있으며, 재미한인탁구협회(KTTA in USA)와 워싱턴 DC 체육협회에 소속되어 있습니다.",
};

export type Leader = {
  name: string;
  role: string;
  roleEn: string;
  note?: string;
};

export const leadership = {
  term: "2025 – 2026",
  intro: "2025년과 2026년을 이끌어갈 워싱턴DC 한인탁구협회의 임원진을 소개합니다.",
  members: [
    { name: "Jason Choi", role: "회장", roleEn: "President" },
    { name: "김선권", role: "부회장", roleEn: "Vice President" },
    { name: "Jim Moon", role: "회계", roleEn: "Treasurer" },
    { name: "기성환", role: "총무", roleEn: "General Secretary" },
    { name: "김진화", role: "감사", roleEn: "Auditor" },
    {
      name: "강병국 (Daniel Kang)",
      role: "고문",
      roleEn: "Advisor",
      note: "동부 한인탁구협회 부회장",
    },
    {
      name: "김성래 (Justin Kim)",
      role: "고문",
      roleEn: "Advisor",
      note: "동부 한인탁구협회 사무총장",
    },
  ] satisfies Leader[],
};

export const bylawsUrl = "/docs/ktta-bylaws.pdf";

// 협회 정관 아래에 놓는 회원 단체 사진
export const groupPhoto = {
  src: "/images/group-photo.jpg",
  width: 3654,
  height: 1288,
  alt: "워싱턴DC 한인탁구협회 회원 단체 사진",
};
