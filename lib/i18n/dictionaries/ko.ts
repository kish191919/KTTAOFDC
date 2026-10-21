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

  /** 실시간 대진표 (/tournaments/[id]/bracket) */
  draw: {
    eyebrow: "Live Draw",
    title: "실시간 대진표",
    metaTitle: (title: string) => `${title} 실시간 대진표`,
    metaDescription: (title: string) =>
      `${title}의 조 편성, 테이블 현황, 결과를 실시간으로 확인하세요.`,
    back: "대회 정보",
    /** 대회 상세 페이지에서 대진표로 가는 안내 */
    openTitle: "실시간 대진표",
    openDescription: "조 편성과 경기 순서, 결과를 실시간으로 보고 점수를 입력할 수 있습니다.",
    openLink: "실시간 대진표 보기",
    preparing:
      "대진표를 준비하고 있습니다. 경기가 시작되면 이곳에 조 편성과 경기 순서가 나옵니다.",
    updated: (time: string) => `${time} 기준 · 5초마다 자동으로 새로 고칩니다`,
    reconnecting: "연결이 잠시 끊겼습니다. 다시 연결하는 중입니다…",
    findTitle: "내 경기 찾기",
    findPlaceholder: "이름을 입력하세요",
    findEmpty: "그 이름의 참가자가 없습니다.",
    findClear: "지우기",
    /** 경기를 눌러 점수를 입력할 수 있다는 안내 (점수 입력을 할 수 있을 때만) */
    tapToScore: "경기가 끝나면 그 경기를 눌러 점수를 입력해 주세요.",
    /** 조별 예선의 같은 안내. 순위표에서 팀을 누르면 그 팀의 경기만 펼쳐집니다. */
    tapTeamToScore: "경기가 끝나면 순위표에서 우리 팀을 눌러 그 경기의 점수를 입력해 주세요.",
    /** 설명 글을 접어 둔 버튼. 누르면 진행 방식과 점수 입력 안내가 펼쳐집니다. */
    guide: "안내",
    viewsLabel: "대진표 보기 선택",
    tablesTab: "테이블 현황",
    table: (n: number) => `${n}번 테이블`,
    tableOpen: "비어 있음",
    /** 조 테이블 카드: 그 조의 아직 치지 않은 경기 */
    remaining: (n: number) => `남은 경기 ${n}`,
    groupTableHint: "조 경기는 순서가 자유입니다. 테이블의 ‘경기 시작’을 눌러 칠 경기를 고르면 모두에게 보입니다.",
    /** 경기가 없는 테이블 카드의 버튼과 고르기 창 */
    startMatch: "경기 시작",
    pickTitle: (table: string) => `${table}에서 칠 경기`,
    pickGroupHint: "이 테이블을 쓰는 조의 남은 경기입니다. 오래 기다린 순서로 보여 드리지만 순서는 자유입니다.",
    pickHint: "본선 경기부터, 오래 기다린 순서로 보여 드립니다. 선수가 다른 경기 중이거나 조 테이블이 비어 있는 경기는 빠져 있습니다.",
    pickEmpty: "지금 이 테이블에서 시작할 수 있는 경기가 없습니다. 예선 경기는 각 조의 테이블에서 칩니다.",
    elsewhere: "테이블을 모르는 진행 중 경기",
    playerBusy: "선수가 다른 경기 중",
    notArrived: "도착 확인 전",
    groupStage: "조별 예선",
    /** 단계 제목 아래 진행 방식 설명. advance 는 조마다 본선에 오르는 인원 */
    groupStageHint: (advance: number) =>
      `같은 조의 모든 팀과 한 번씩 경기합니다. 조 ${
        advance === 1 ? "1위가" : advance === 2 ? "1·2위가" : `1~${advance}위가`
      } 본선 토너먼트에 오릅니다. 경기 순서는 자유입니다.`,
    leagueHint: "모든 팀과 한 번씩 경기합니다. 경기 순서는 자유입니다.",
    /** 조 순위 기준. 진행 방식 설명 뒤에 붙습니다. (lib/draw/play.ts 의 standings) */
    rankingRule: "순위는 승점(승 2 · 패 1 · 기권패 0)으로 정하고, 승점이 같으면 서로 맞붙은 경기 결과로 정합니다.",
    knockout: "본선 토너먼트",
    knockoutHint: "지면 탈락하고, 이기면 다음 라운드에 오릅니다.",
    group: (letter: string) => `${letter}조`,
    groupRank: (letter: string, rank: number) => `${letter}조 ${rank}위`,
    /** size 는 그 라운드에 오른 인원 */
    round: (size: number) => (size <= 2 ? "결승" : size === 4 ? "준결승" : `${size}강`),
    matchNo: (n: number) => `${n}경기`,
    winnerOf: (label: string) => `${label} 승자`,
    /** 경기 목록에서 두 팀 사이에 넣는 글 */
    versus: "vs",
    bye: "부전승",
    rank: "순위",
    entryHeading: (doubles: boolean): string => (doubles ? "팀" : "선수"),
    record: "승패",
    games: "세트 승패",
    winLoss: (wins: number, losses: number) => `${wins}승 ${losses}패`,
    /** 조별 예선 안내에서 순위 기준 뒤에 붙습니다. */
    provisional: "조 경기가 끝나면 순위가 확정됩니다.",
    advances: "본선 진출",
    withdrawn: "불참",
    bestOf: (n: number) => `${n}세트 ${Math.floor(n / 2) + 1}선승`,
    /** 본선을 다른 방식으로 치는 종목의 경기 방식. from 은 바뀌는 라운드에 오른 인원이고, 비어 있으면 본선 전체입니다. */
    splitFormat: (group: number, knockout: number, from?: number) => {
      const format = (n: number) => `${n}세트 ${Math.floor(n / 2) + 1}선승`;
      if (!from) return `예선 ${format(group)} · 본선 ${format(knockout)}`;
      const round = from <= 2 ? "결승" : from === 4 ? "준결승부터" : `${from}강부터`;
      return `${format(group)} · ${round} ${format(knockout)}`;
    },
    state: {
      done: "종료",
      playing: "경기 중",
      ready: "경기 전",
      pending: "상대 결정 전",
      bye: "부전승",
    },
    walkover: "기권승",
    podium: {
      champion: "우승",
      runnerUp: "준우승",
      jointThird: "공동 3위",
      second: "2위",
      third: "3위",
    },
    /** 점수 입력 창의 테이블 칸 */
    start: {
      title: "테이블",
      at: (table: string) => `${table}에서 시작`,
      replaces: (label: string) => `지금 이 테이블에 올라 있는 경기(${label})는 대기로 돌아갑니다.`,
      otherTables: "다른 빈 테이블",
      freeTables: "빈 테이블을 골라 시작",
      none: "지금 빈 테이블이 없습니다. 테이블이 비면 시작해 주세요.",
      /** 경기 중인 경기의 제목 옆 테이블 표시를 누르면 열리는 칸 */
      moveTo: "다른 테이블로 옮기기",
      moveNone: "지금 옮길 수 있는 빈 테이블이 없습니다.",
      hint: "시작을 누르면 모두의 화면에 경기 중으로 보입니다. 누르지 않고 점수만 넣어도 됩니다.",
      playerBusy: "선수가 다른 경기 중이라 아직 시작할 수 없습니다.",
      notArrived: "도착 확인 전인 팀이 있어 아직 시작할 수 없습니다.",
    },
    enterScore: "점수 입력",
    scoringClosed: "점수 입력이 마감되었습니다.",
    score: {
      title: "점수 입력",
      close: "닫기",
      modePoints: "세트별 점수",
      modeSets: "세트 스코어",
      modeWalkover: "기권",
      game: (n: number) => `${n}세트`,
      pointsHint:
        "끝난 세트까지만 적어도 됩니다. 세트가 끝날 때마다 저장하면 진행 상황이 모두에게 보입니다.",
      setsHint: "양쪽이 딴 세트 수를 위 점수판에 적어 주세요. 세트별 점수를 모를 때 씁니다.",
      setsInvalid: (need: number, bestOf: number) =>
        `세트 수를 다시 확인해 주세요. 이긴 쪽은 ${need}세트 이상이고, 두 쪽을 합쳐 ${bestOf}세트까지입니다.`,
      walkoverHint: "기권한 쪽을 고르면 상대가 이긴 것으로 적힙니다.",
      withdrew: (name: string) => `${name} 기권`,
      total: "세트 스코어",
      save: "저장",
      saving: "저장하는 중…",
    },
    errors: {
      notFound: "경기를 찾을 수 없습니다. 화면을 새로 고쳐 주세요.",
      notReady: "아직 상대가 정해지지 않은 경기입니다.",
      closed: "점수 입력이 마감되었습니다. 대회 본부에 알려 주세요.",
      conflict:
        "그 사이 다른 분이 이 경기의 점수를 입력했습니다. 바뀐 결과를 확인한 뒤 다시 입력해 주세요.",
      points:
        "세트 점수를 다시 확인해 주세요. 11점을 먼저 내야 이기고, 10:10 뒤에는 2점을 앞서야 합니다.",
      sets: "세트 수를 다시 확인해 주세요.",
      locked:
        "이 결과로 다음 경기의 상대가 바뀌는데, 그 경기가 이미 시작되어 고칠 수 없습니다. 대회 본부에 알려 주세요.",
      busy: "지금 입력하는 분이 많습니다. 한 번 더 눌러 주세요.",
      tableTaken: "그 사이 다른 분이 이 테이블에 경기를 올렸습니다. 바뀐 화면을 확인해 주세요.",
      tableInUse: "그 테이블은 지금 다른 경기가 쓰고 있습니다. 빈 테이블을 골라 주세요.",
      playerBusy: "선수가 다른 테이블에서 경기 중입니다. 그 경기 점수를 먼저 넣어 주세요.",
      notArrived: "아직 도착 확인을 하지 않은 팀이 있습니다. 접수 데스크에 알려 주세요.",
      network: "저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.",
    },
    /** 내 경기 찾기에서 보여 주는 지금 상태 */
    status: {
      playingAt: (table: string) => `지금 ${table}에서 경기 중`,
      playing: "지금 경기 중",
      next: "다음 경기",
      opponent: "상대",
      nextAt: (table: string) => `다음 경기 · ${table}`,
      nextFree: "다음 경기 · 빈 테이블에서 시작",
      waitingOpponent: "상대가 정해지기를 기다리고 있습니다.",
      waitingGroup: "조 경기를 모두 마쳤습니다. 같은 조의 다른 경기가 끝나면 순위가 정해집니다.",
      outGroup: (group: string, rank: number) => `예선 ${group} ${rank}위로 경기를 마쳤습니다.`,
      outRound: (round: string) => `${round}에서 경기를 마쳤습니다.`,
      champion: "우승을 축하합니다!",
      finished: "경기를 모두 마쳤습니다.",
      notStarted: "아직 시작하지 않은 종목입니다.",
      checkInFirst: "도착 확인 전이라 경기를 시작할 수 없습니다. 접수 데스크에 도착을 알려 주세요.",
      excluded: "대진을 확정할 때 도착하지 않아 대진에서 빠졌습니다.",
      forfeit: "불참으로 처리되어 남은 경기는 기권패로 적혔습니다.",
    },
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
