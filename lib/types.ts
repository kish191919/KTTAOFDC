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
  body?: string;
  linkUrl?: string;
  linkLabel?: string;
  /** 첫 번째 이미지가 목록에 보이는 대표 포스터입니다. */
  images: ImageRef[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
};

export type Album = {
  id: string;
  title: string;
  /** 행사 날짜 (YYYY-MM-DD) */
  date: string;
  description?: string;
  /** 첫 번째 사진이 앨범 표지입니다. */
  photos: ImageRef[];
  createdAt: string;
  updatedAt: string;
};
