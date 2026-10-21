export type ImageRef = {
  src: string;
  width?: number;
  height?: number;
};

/** 앨범에 넣는 동영상 한 개 */
export type VideoRef = {
  src: string;
  /** 재생하기 전에 보여 주는 대표 화면 (이미지 주소) */
  poster?: string;
  width?: number;
  height?: number;
};

export type Attachment = {
  name: string;
  url: string;
  size?: number;
};

/**
 * 영어 화면(/en)에 보여 줄 글. 한국어 글과 같은 이름의 칸에 영어를 적습니다.
 * 비워 둔 칸은 영어 화면에도 한국어 글이 그대로 나옵니다. (lib/i18n/localize.ts)
 */
export type TournamentEnglish = Partial<
  Pick<
    Tournament,
    | "title"
    | "summary"
    | "venue"
    | "organizer"
    | "fee"
    | "contact"
    | "linkLabel"
    | "body"
    | "fullText"
  >
>;
export type NewsPostEnglish = Partial<Pick<NewsPost, "title" | "source" | "body">>;
export type AlbumEnglish = Partial<Pick<Album, "title" | "description">>;

export type Tournament = {
  id: string;
  title: string;
  /** 대회 현지 날짜 (YYYY-MM-DD) */
  startDate: string;
  /** 대회 현지 시각 (HH:MM, 24시간제) */
  startTime?: string;
  endDate?: string;
  endTime?: string;
  venue?: string;
  address?: string;
  organizer?: string;
  fee?: string;
  /** 신청 마감일 (YYYY-MM-DD) */
  deadline?: string;
  contact?: string;
  summary?: string;
  /** 포스터에 없는 안내·대회 결과처럼 상세 페이지에 항상 펼쳐서 보여 주는 글 */
  body?: string;
  /** 포스터·요강을 그대로 옮겨 적은 글. 포스터와 겹치므로 상세 페이지에는 접힌 채로 보입니다. */
  fullText?: string;
  linkUrl?: string;
  linkLabel?: string;
  /** 영어 화면용 글. 영어 화면에서 fullText 는 포스터를 간추린 영문 요약으로 씁니다. */
  en?: TournamentEnglish;
  /** 첫 번째 이미지가 목록에 보이는 대표 포스터입니다. */
  images: ImageRef[];
  attachments: Attachment[];
  /** true 면 저장만 해 두고 방문자에게는 보이지 않습니다. (관리자 화면에서만 보입니다) */
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 커뮤니티의 '탁구 소식'에 올리는 글 한 편 (신문 기사, 회원 안내 등) */
export type NewsPost = {
  id: string;
  title: string;
  /** 기사가 실린 날짜 또는 글을 올린 날짜 (YYYY-MM-DD) */
  date: string;
  /** 기사가 실린 신문·방송 이름 */
  source?: string;
  /** 기사 원문 등 관련 링크 */
  linkUrl?: string;
  body?: string;
  /** 영어 화면용 글 */
  en?: NewsPostEnglish;
  /** 첫 번째 이미지가 목록에 보이는 대표 이미지입니다. */
  images: ImageRef[];
  attachments: Attachment[];
  /** true 면 저장만 해 두고 방문자에게는 보이지 않습니다. (관리자 화면에서만 보입니다) */
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
};

/** 홈 화면 맨 위에서 차례로 보여 주는 동영상·이미지 한 개 */
export type HeroMedia = {
  id: string;
  /** 관리 화면의 목록과 이미지 대체 텍스트에 쓰입니다. */
  title: string;
  type: "image" | "video";
  src: string;
  width?: number;
  height?: number;
  /** false 면 올려 두기만 하고 홈 화면에는 내보내지 않습니다. */
  active: boolean;
  createdAt: string;
};

export type Album = {
  id: string;
  title: string;
  /** 행사 날짜 (YYYY-MM-DD) */
  date: string;
  description?: string;
  /** 영어 화면용 글 */
  en?: AlbumEnglish;
  /** 첫 번째 사진이 앨범 표지입니다. */
  photos: ImageRef[];
  /** 사진 아래에 따로 묶어 보여 주는 동영상. 없으면 칸을 남기지 않습니다. */
  videos?: VideoRef[];
  /** true 면 저장만 해 두고 방문자에게는 보이지 않습니다. (관리자 화면에서만 보입니다) */
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
};

// ───────────────────────── 대진표 ─────────────────────────
// 대회 하나에 Draw 하나가 있고, 그 안에 종목(DrawEvent)이 여럿 들어갑니다.
// 종목은 예선 조별 리그 → 본선 토너먼트로 진행합니다. 계산은 lib/draw/ 에서 합니다.

/** 대회에 신청한 선수 한 명. 대회 날 접수 데스크에서 도착을 확인합니다. */
export type DrawPlayer = {
  id: string;
  /** 대회 안에서 겹치지 않는 이름. 종목의 팀(DrawEntry.players)은 이 이름으로 선수를 가리킵니다. */
  name: string;
  rating?: number;
  club?: string;
  /** 대회 날 도착을 확인한 때 */
  checkedInAt?: string;
};

/** 대진표에 오른 선수 한 명 또는 복식 한 팀 */
export type DrawEntry = {
  id: string;
  /** 선수 이름. 복식은 두 사람 */
  players: string[];
  /** 레이팅. 복식은 두 사람의 합입니다. 모르면 비워 둡니다. */
  rating?: number;
  /** 소속(클럽·지역). 같은 소속은 되도록 다른 조로 나눕니다. */
  club?: string;
  /**
   * 오지 않은 팀. excluded 는 대진을 확정할 때 빠진 팀(조에 없음),
   * forfeit 는 경기 중에 불참 처리한 팀(남은 경기를 기권패로 적습니다)입니다.
   */
  absent?: "excluded" | "forfeit";
};

/**
 * 경기의 한쪽 자리. 예선은 참가자가 정해져 있고, 본선은 앞선 결과로 채워집니다.
 * group 은 0 이 A조, rank 는 1 이 1위입니다.
 */
export type DrawSlot =
  | { entry: string }
  | { group: number; rank: number }
  | { winnerOf: string }
  | { bye: true };

export type DrawMatch = {
  id: string;
  stage: "group" | "knockout";
  /** 예선 조 (0 = A조) */
  group?: number;
  /** 예선은 조 안의 경기 차례, 본선은 라운드 (0 = 첫 라운드) */
  round: number;
  /** 본선 라운드 안에서 위에서부터의 자리 */
  position?: number;
  a: DrawSlot;
  b: DrawSlot;
  /** 이긴 게임 수 [a, b]. 경기 중이면 지금까지의 수입니다. */
  sets?: [number, number];
  /** 게임별 점수 [a, b]. 점수를 적었을 때만 있습니다. */
  points?: [number, number][];
  /** 한쪽이 기권해 경기 없이 이긴 쪽 */
  walkover?: "a" | "b";
  /** 불참 처리로 저절로 적힌 기권승. 불참을 취소하면 함께 지웁니다. */
  forfeit?: boolean;
  /** 누군가 이 테이블에서 시작한 경기의 테이블 번호 (1부터) */
  table?: number;
  /** 테이블에 올릴 때의 두 참가자 id. 앞 결과가 고쳐져 참가자가 바뀌면 테이블에서 내립니다. */
  calledFor?: [string, string];
  /** 테이블에 올린 때 */
  calledAt?: string;
  finishedAt?: string;
};

export type DrawEvent = {
  id: string;
  /** 종목 이름 (예: "복식 U1000") */
  name: string;
  nameEn?: string;
  doubles: boolean;
  /** 몇 게임 경기인지 (3 · 5 · 7). 과반을 먼저 이기면 이깁니다. 본선 방식을 따로 정하지 않으면 모든 경기가 이 방식입니다. */
  bestOf: number;
  /** 본선을 다른 방식으로 칠 때 그 방식 (3 · 5 · 7). 비어 있으면 본선도 bestOf 입니다. (lib/draw/play.ts 의 matchBestOf) */
  knockoutBestOf?: number;
  /** knockoutBestOf 로 치기 시작하는 라운드에 오른 인원 (2 = 결승만, 4 = 준결승부터, 8 = 8강부터). 비어 있으면 본선 전체입니다. */
  knockoutFrom?: number;
  /** 예선 한 조의 인원. 나누어떨어지지 않으면 한 명 적은 조가 생깁니다. */
  groupSize: number;
  /** 조마다 본선에 오르는 인원 */
  advance: number;
  entries: DrawEntry[];
  /** 조 편성. 조마다 참가자 id 를 시드 순서대로 적습니다. */
  groups: string[][];
  /**
   * 조마다 경기하는 테이블 번호 (0번 칸이 A조). 조 안의 경기는 이 테이블에서 아무 순서로나 칩니다.
   * 대진을 확정할 때 정하고, 비어 있으면 lib/draw/play.ts 의 fillGroupTables 가 채웁니다.
   */
  groupTables?: number[];
  /**
   * 조마다 조 테이블 말고 함께 쓰는 테이블 (0번 칸이 A조). 4팀 조는 두 경기를 동시에 칠 수 있어 남는 테이블을 하나 더 씁니다.
   * 비어 있으면(이 칸이 생기기 전의 대진표 포함) fillGroupTables 가 남는 테이블로 채웁니다. 빈 배열은 더 쓰지 않는 조입니다.
   */
  extraTables?: number[][];
  /** setup: 참가자 등록·조 편성 중, live: 경기 진행 중 */
  status: "setup" | "live";
  matches: DrawMatch[];
  startedAt?: string;
  /** 체크인을 거쳐 확정한 종목. 도착하지 않은 팀의 경기는 테이블에서 시작하지 않습니다. */
  checkIn?: boolean;
  /** 확정하기 전의 조 편성. '조 편성으로 되돌리기'를 하면 이것으로 돌아갑니다. */
  draft?: string[][];
};

/** 점수 입력 기록 한 줄 */
export type DrawLog = {
  at: string;
  event: string;
  match: string;
  sets?: [number, number];
  walkover?: "a" | "b";
  /** 결과를 지운 경우 */
  cleared?: boolean;
  /** 관리자 화면에서 입력한 경우 */
  admin?: boolean;
};

export type Draw = {
  /** 대회 id 와 같습니다. */
  id: string;
  /** 대회장에서 쓰는 테이블 수. 0 이면 테이블 없이 진행합니다. */
  tables: number;
  /** false 면 방문자는 점수를 입력할 수 없고 관리자만 입력합니다. */
  scoringOpen: boolean;
  /** false 면 체크인 없이 등록한 팀으로 바로 대진을 확정합니다. 비어 있으면 체크인을 씁니다. */
  checkIn?: boolean;
  /** 선수 명단. 비어 있으면 종목의 팀 이름들로 만듭니다. (lib/draw/roster.ts) */
  players?: DrawPlayer[];
  events: DrawEvent[];
  /** 최근 점수 입력 기록 (새 것이 앞) */
  log: DrawLog[];
  /** 저장할 때마다 1씩 늘어납니다. 동시에 고친 내용이 서로 덮어쓰지 않게 확인합니다. */
  version: number;
  updatedAt: string;
};
