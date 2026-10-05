export type ImageRef = {
  src: string;
  width?: number;
  height?: number;
};

export type Attachment = {
  name: string;
  url: string;
  size?: number;
};

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
  /** 첫 번째 이미지가 목록에 보이는 대표 포스터입니다. */
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
  /** 첫 번째 사진이 앨범 표지입니다. */
  photos: ImageRef[];
  /** true 면 저장만 해 두고 방문자에게는 보이지 않습니다. (관리자 화면에서만 보입니다) */
  hidden?: boolean;
  createdAt: string;
  updatedAt: string;
};
