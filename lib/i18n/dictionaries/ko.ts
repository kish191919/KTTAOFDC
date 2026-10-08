// 한국어 화면 문구. 문구를 더하거나 고칠 때는 en.ts 에도 같은 자리에 영어 문구를 넣습니다.
// (en.ts 는 이 파일과 모양이 같아야 해서, 한쪽만 고치면 타입 검사에서 알려 줍니다)

export const ko = {
  site: {
    /** 브라우저 탭과 링크 미리보기에 쓰는 협회 이름 */
    fullName: "워싱턴DC 한인탁구협회",
    /** 홈 화면의 제목. 검색 결과에 그대로 보이므로 협회 이름과 지역을 함께 적습니다. */
    homeTitle: "워싱턴DC 한인탁구협회 (KTTA of DC) | 버지니아·워싱턴DC 탁구",
    /** 다른 페이지의 제목 뒤에 붙는 이름: "대회 정보 | 워싱턴DC 한인탁구협회" */
    titleSuffix: "워싱턴DC 한인탁구협회",
    /** 로고 옆에 두 줄로 놓는 이름 */
    logoLines: ["워싱턴DC", "한인탁구협회"],
    /** 푸터에서 협회 이름 아래 작게 놓는 다른 언어 이름 */
    otherName: "Korean Table Tennis Association of DC",
    homeLabel: "KTTA of DC 워싱턴DC 한인탁구협회 홈",
    keywords: [
      "워싱턴DC 한인탁구협회",
      "워싱턴DC 탁구협회",
      "워싱턴DC 탁구",
      "버지니아 탁구협회",
      "버지니아 탁구",
      "미주 탁구협회",
      "탁구협회",
      "한인탁구",
      "한인 탁구",
      "탁구대회",
      "KTTA of DC",
      "Korean Table Tennis Association of DC",
    ],
    rssTitle: "KTTA of DC 대회 소식",
  },

  nav: {
    main: "주 메뉴",
    mobile: "모바일 메뉴",
    open: "메뉴 열기",
    close: "메뉴 닫기",
    quickLinks: "바로가기",
    admin: "관리자",
  },

  contact: {
    title: "협회에 문의하기",
    description: "궁금한 점은 아래 이메일로 보내 주세요.",
    copy: "이메일 주소 복사",
    copied: "주소를 복사했습니다",
    gmail: "Gmail 로 보내기",
    mailApp: "메일 앱으로 보내기",
    mailAppHint:
      "메일 앱이 열리지 않았다면 이 기기에 메일 앱이 설정되어 있지 않은 것입니다. 주소를 복사하거나 Gmail 로 보내 주세요.",
    close: "닫기",
  },

  home: {
    bannerAlt:
      "KTTA of DC 워싱턴DC 한인탁구협회 — Korean Table Tennis Association of DC. Table Tennis Builds a Better Community",
    welcomeEyebrow: "Welcome",
    aboutLink: "협회 소개 더 보기",
    tournamentsEyebrow: "Tournaments",
    tournamentsTitle: "대회 정보",
    tournamentsDescription: "다가오는 대회와 최근 대회 소식을 확인하세요.",
    tournamentsEmpty:
      "등록된 대회가 아직 없습니다. 새 대회 소식이 올라오면 이곳에서 안내해 드립니다.",
    tournamentsLink: "전체 대회 일정 보기",
    galleryEyebrow: "Gallery",
    galleryTitle: "활동 현장",
    galleryDescription: "대회와 모임의 순간들을 사진으로 만나보세요.",
    galleryLink: "전체 갤러리 보기",
    joinTitle: "탁구로 하나 되는 즐거움, 함께하세요",
    joinDescription: "가까운 탁구 장소를 찾아보고, 궁금한 점은 언제든지 협회로 문의해 주세요.",
    venuesLink: "탁구 장소 보기",
    emailLink: "이메일 문의",
  },

  about: {
    eyebrow: "About",
    title: "협회 소개",
    metaDescription:
      "워싱턴DC 한인탁구협회(KTTA of DC) 협회장 인사말과 임원진, 협회 정관을 소개합니다.",
    greetingEyebrow: "Welcome Message",
    greetingTitle: "협회장 인사말",
    leadershipEyebrow: "Leadership Team",
    leadershipTitle: "임원진",
    term: (years: string) => `임기 ${years}`,
    bylawsTitle: "협회 정관",
    bylawsDescription: "협회의 목적과 운영 원칙을 담은 정관을 PDF 문서로 확인하실 수 있습니다.",
    bylawsLink: "협회 정관 보기 (PDF)",
  },

  tournaments: {
    eyebrow: "Tournaments",
    title: "대회 정보",
    /** 검색 결과에 보이는 제목. 화면의 제목(title)보다 무엇을 다루는지 풀어서 적습니다. */
    metaTitle: "탁구대회 일정",
    metaDescription:
      "버지니아·워싱턴DC 지역 한인 탁구대회의 일정과 요강을 워싱턴DC 한인탁구협회가 안내합니다.",
    description: "협회가 주최하거나 함께 참가하는 탁구대회의 일정과 요강을 안내합니다.",
    upcoming: "예정된 대회",
    count: (n: number) => `${n}건`,
    upcomingEmpty:
      "현재 예정된 대회가 없습니다. 새 대회 소식이 올라오면 이곳에서 안내해 드립니다.",
    past: "지난 대회",
    year: (year: number) => `${year}년`,
    cardLink: "세부 정보",
    back: "대회 정보",
    infoTitle: "대회 안내",
    schedule: "일시",
    venue: "장소",
    organizer: "주최 · 주관",
    fee: "참가비",
    deadline: "신청 마감",
    contact: "문의",
    openLink: "관련 링크 열기",
    map: "지도에서 보기",
    calendar: "Google 캘린더에 추가",
    bodyTitle: "대회 소개",
    posterTitle: "대회 포스터",
    fullTextTitle: "요강 전문 글로 보기",
    fullTextHint:
      "포스터나 첨부 파일의 내용을 글로 옮긴 것입니다. 글자가 작아 읽기 어렵거나 연락처를 복사할 때 펼쳐 보세요.",
    /** 영어 화면에서 영문 요강이 없어 한국어 글을 대신 보여 줄 때 쓰는 문구. 한국어 화면에서는 위 문구와 같습니다. */
    fullTextFallbackTitle: "요강 전문 글로 보기",
    fullTextFallbackHint:
      "포스터나 첨부 파일의 내용을 글로 옮긴 것입니다. 글자가 작아 읽기 어렵거나 연락처를 복사할 때 펼쳐 보세요.",
    attachments: "첨부 파일",
    noDetails: "자세한 대회 요강은 준비되는 대로 이곳에 올려 드립니다.",
    more: "다른 대회 보기",
  },

  gallery: {
    eyebrow: "Gallery",
    title: "갤러리",
    metaDescription: "워싱턴DC 한인탁구협회의 대회와 모임 사진을 모았습니다.",
    description: "대회와 모임의 순간들을 사진으로 만나보세요.",
    emptyTitle: "사진을 준비하고 있습니다",
    emptyDescription: "행사 사진이 올라오면 이곳에서 앨범별로 보실 수 있습니다.",
    year: (year: number) => `${year}년`,
    /** 앨범에 든 사진·동영상 수. 동영상이 없으면 사진 수만 적습니다. */
    mediaCount: (photos: number, videos: number) =>
      [photos > 0 || videos === 0 ? `사진 ${photos}장` : "", videos > 0 ? `동영상 ${videos}개` : ""]
        .filter(Boolean)
        .join(" · "),
    cardLink: "사진 보기",
    back: "갤러리",
    noPhotos: "아직 등록된 사진이 없습니다.",
    more: "다른 앨범 보기",
    download: "사진 내려받기",
    downloadHint: "내려받을 사진을 눌러서 골라 주세요.",
    selected: (n: number) => `${n}장 선택`,
    selectAll: "전체 선택",
    deselectAll: "전체 해제",
    downloadStart: "내려받기",
    preparing: (done: number, total: number) => `준비하는 중… (${done}/${total})`,
    cancel: "취소",
    partialFailure: (n: number) => `${n}장은 받아 오지 못해 나머지 사진만 내려받았습니다.`,
    downloadFailure: "사진을 내려받지 못했습니다. 잠시 뒤에 다시 시도해 주세요.",
    photoAlt: (title: string, n: number) => `${title} 사진 ${n}`,
    photoSelect: (title: string, n: number) => `${title} 사진 ${n} 선택`,
    photoEnlarge: (title: string, n: number) => `${title} 사진 ${n} 크게 보기`,
    videosTitle: "동영상",
    videoPlay: (title: string, n: number) => `${title} 동영상 ${n} 재생`,
  },

  community: {
    eyebrow: "Community",
    tabsLabel: "커뮤니티 메뉴",
    news: "탁구 소식",
    venues: "탁구 장소",
    etiquette: "탁구 에티켓",
  },

  news: {
    metaDescription: "신문에 실린 협회 소식과 탁구인에게 필요한 정보를 전해 드립니다.",
    description: "신문에 실린 협회 소식과 회원 여러분께 필요한 정보를 전해 드립니다.",
    emptyTitle: "소식을 준비하고 있습니다",
    emptyDescription: "신문 기사와 회원 안내가 올라오면 이곳에서 보실 수 있습니다.",
    original: "기사 원문 보기",
    openLink: "관련 링크 열기",
    attachments: "첨부 파일",
    more: "다른 소식 보기",
  },

  venues: {
    metaTitle: "버지니아·워싱턴DC 탁구 장소",
    metaDescription:
      "북버지니아와 워싱턴DC 인근에서 탁구를 칠 수 있는 장소와 시간, 연락처를 워싱턴DC 한인탁구협회가 안내합니다.",
    hours: "시간",
    address: "주소",
    contact: "연락처",
    website: "홈페이지",
  },

  etiquette: {
    metaDescription: "탁구장에서 서로 즐겁게 운동하기 위해 지켜야 할 에티켓을 안내합니다.",
    description: (total: number) =>
      `모두가 즐겁게 운동하기 위한 ${total}가지 약속입니다.`,
  },

  viewer: {
    dialog: (label: string) => `${label} 이미지 크게 보기`,
    alt: (label: string, n: number) => `${label} 이미지 ${n}`,
    enlarge: (label: string, n: number) => `${label} 이미지 ${n} 크게 보기`,
    close: "닫기",
    previous: "이전 이미지",
    next: "다음 이미지",
    videoDialog: (label: string) => `${label} 동영상 보기`,
    videoAlt: (label: string, n: number) => `${label} 동영상 ${n}`,
    previousVideo: "이전 동영상",
    nextVideo: "다음 동영상",
  },

  hero: {
    label: "메인 화면",
    previous: "이전 슬라이드",
    next: "다음 슬라이드",
    slide: (n: number) => `슬라이드 ${n}`,
    unmute: "소리 켜기",
    mute: "소리 끄기",
  },

  notFound: {
    title: "페이지를 찾을 수 없습니다",
    description: "주소가 바뀌었거나 삭제된 페이지입니다. 아래 버튼으로 이동해 주세요.",
    home: "홈으로",
    tournaments: "대회 정보 보기",
  },

  /** 언어 전환 버튼. 바꿀 언어를 쓰는 사람이 읽을 수 있게 그 언어로 적습니다. */
  langToggle: {
    label: "View this page in English",
    short: "English",
  },
};

export type Dictionary = typeof ko;
