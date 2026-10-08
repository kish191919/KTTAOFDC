import type { Localized } from "@/lib/i18n/config";

// 협회 소개 페이지 내용 — 기존 홈페이지(kttava.org)의 글을 옮겨 왔습니다.
// 글은 한국어(ko)와 영어(en)를 나란히 적습니다. 한쪽을 고치면 다른 쪽도 함께 고쳐 주세요.

export const greeting = {
  welcome: {
    ko: "워싱턴DC 한인탁구협회 홈페이지를 방문해 주셔서 감사합니다.",
    en: "Welcome to the Korean Table Tennis Association of DC.",
  },
  // 홈 화면 큰 제목에서 협회 이름 바로 아래에 놓는 인사 한 줄.
  thanks: {
    ko: "홈페이지를 방문해 주셔서 감사합니다.",
    en: "Thank you for visiting our website.",
  },
  // 홈 화면에는 이 한 문장만 보여 줍니다. 전체 글(paragraphs)은 협회 소개에 나옵니다.
  // 끊어 읽는 단위로 나눠 적습니다. 칸이 좁아 줄이 바뀔 때 이 단위 사이에서만 바뀝니다.
  summary: {
    ko: ["탁구로 하나 되어 만들어갈 더 밝은 미래를", "여러분과 함께 꿈꿉니다."],
    en: ["United by table tennis,", "we look forward to building", "a brighter future together."],
  },
  paragraphs: {
    ko: [
      "안녕하세요, 워싱턴DC 한인탁구협회 회장입니다.",
      "탁구는 도전과 성취, 그리고 협력의 가치를 동시에 담고 있는 스포츠입니다.",
      "우리 협회는 탁구의 발전과 대중화를 위해 지속적으로 노력하고 있으며, 모든 탁구인들이 함께 성장할 수 있는 환경을 제공하기 위해 힘쓰고 있습니다.",
      "이 홈페이지를 통해 다양한 소식과 정보를 접하시고, 탁구에 대한 관심과 참여가 더욱 확장되기를 바랍니다. 탁구로 하나 되어 만들어갈 더 밝은 미래를 여러분과 함께 꿈꿉니다.",
      "감사합니다.",
    ],
    en: [
      "Welcome, and thank you for visiting the Korean Table Tennis Association of DC.",
      "Table tennis is a sport of challenge, achievement, and teamwork.",
      "Our association works to grow the sport and open it to everyone, and to give every player a place to improve alongside others.",
      "We hope this site keeps you informed and inspires you to get involved. United by table tennis, we look forward to building a brighter future together.",
      "Thank you.",
    ],
  },
  signature: {
    ko: "워싱턴DC 한인탁구협회장 Jason Choi",
    en: "Jason Choi, President",
  },
  // 협회 소개의 인사말 옆에 놓는 협회장 사진. 사진을 바꾸면 가로·세로 크기도 함께 고칩니다.
  photo: { src: "/images/president.jpg", width: 1184, height: 1504 },
};

// 홈 화면 인사말 아래에 놓는 협회 소개 글. 문장마다 새 줄에서 시작하도록 한 문장씩 나눠 적습니다.
// 검색 사이트가 이 글로 협회가 어디에서 무엇을 하는 곳인지 알게 되므로, 지역과 하는 일을 빠뜨리지 않고 적습니다.
// (영어 글의   는 줄이 바뀌지 않는 띄어쓰기입니다. "Washington, DC" 가 두 줄로 갈라지지 않게 합니다)
export const homeIntro: Localized<string[]> = {
  ko: [
    "워싱턴DC 한인탁구협회(KTTA of DC)는 버지니아와 워싱턴DC 지역의 한인 탁구 동호인들이 함께하는 탁구협회입니다.",
    "미주 각 지역의 한인 탁구협회가 모인 재미한인탁구협회(KTTA in USA) 소속으로, 탁구대회 일정과 탁구 칠 수 있는 장소, 협회 소식을 안내합니다.",
  ],
  en: [
    "The Korean Table Tennis Association of DC (KTTA of DC) brings together Korean American table tennis players across Virginia and the Washington, DC area.",
    "A member of the Korean Table Tennis Association in USA (KTTA in USA), we share tournament schedules, places to play, and association news.",
  ],
};

// 홈 화면 인사말 옆에 놓는 회원 단체 사진. 사진을 바꾸면 가로·세로 크기도 함께 고칩니다.
export const welcomePhoto = {
  src: "/images/welcome-group.jpg",
  width: 1982,
  height: 918,
  alt: {
    ko: "탁구장에 함께 모인 워싱턴DC 한인탁구협회 회원 단체 사진",
    en: "Members of the Korean Table Tennis Association of DC gathered at a table tennis hall",
  },
};

export const about = {
  lead: {
    ko: "워싱턴DC 한인탁구협회는",
    en: "Who We Are",
  },
  body: {
    ko: "탁구를 사랑하는 열정적인 사람들로 구성된 활기찬 커뮤니티입니다. 협회는 버지니아 주 전역에서 탁구의 발전과 저변 확대를 위해 헌신하고 있으며, 재미한인탁구협회(KTTA in USA)와 워싱턴 DC 체육협회에 소속되어 있습니다.",
    en: "We are a vibrant community of people who love table tennis. The association is dedicated to growing the sport and broadening participation across Virginia, and is affiliated with the Korean Table Tennis Association in USA (KTTA in USA) and the Washington DC Sports Association.",
  },
};

export type Leader = {
  /** 영문 이름을 따로 쓰지 않는 분은 영어 화면에 로마자 표기와 한글 이름을 함께 적습니다. */
  name: Localized;
  role: Localized;
};

export const leadership = {
  term: "2025 – 2026",
  intro: {
    ko: "2025년과 2026년을 이끌어갈 워싱턴DC 한인탁구협회의 임원진을 소개합니다.",
    en: "Meet the officers leading the association through 2025 and 2026.",
  },
  members: [
    {
      name: { ko: "Jason Choi", en: "Jason Choi" },
      role: { ko: "회장", en: "President" },
    },
    {
      name: { ko: "김선권", en: "Sunkwon Kim (김선권)" },
      role: { ko: "부회장", en: "Vice President" },
    },
    {
      name: { ko: "Jim Moon", en: "Jim Moon" },
      role: { ko: "회계", en: "Treasurer" },
    },
    {
      name: { ko: "기성환", en: "Danny (Sunghwan) Ki" },
      role: { ko: "총무", en: "General Secretary" },
    },
    {
      name: { ko: "김진화", en: "Jinhwa Kim (김진화)" },
      role: { ko: "감사", en: "Auditor" },
    },
    {
      name: { ko: "강병국 (Daniel Kang)", en: "Daniel Kang" },
      role: { ko: "고문", en: "Advisor" },
    },
    {
      name: { ko: "김성래 (Justin Kim)", en: "Justin Kim" },
      role: { ko: "고문", en: "Advisor" },
    },
  ] satisfies Leader[],
};

export const bylawsUrl = "/docs/ktta-bylaws.pdf";

// 협회 정관 아래에 놓는 회원 단체 사진
export const groupPhoto = {
  src: "/images/group-photo.jpg",
  width: 3654,
  height: 1288,
  alt: {
    ko: "워싱턴DC 한인탁구협회 회원 단체 사진",
    en: "Group photo of Korean Table Tennis Association of DC members",
  },
};
