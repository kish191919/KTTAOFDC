"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  isAdmin,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/auth";
import { isValidDate, TIME_RE } from "@/lib/dates";
import { isUploadUrl, mediaTypeOf, removeUploads } from "@/lib/store/files";
import {
  addHeroMedia,
  deleteHeroMedia,
  MAX_HERO_MEDIA,
  moveHeroMedia,
  setHeroMediaActive,
} from "@/lib/store/hero";
import {
  createAlbum,
  deleteAlbum,
  setAlbumHidden,
  updateAlbum,
  type AlbumInput,
} from "@/lib/store/albums";
import {
  createNewsPost,
  deleteNewsPost,
  setNewsPostHidden,
  updateNewsPost,
  type NewsPostInput,
} from "@/lib/store/news";
import {
  createTournament,
  deleteTournament,
  setTournamentHidden,
  updateTournament,
  type TournamentInput,
} from "@/lib/store/tournaments";
import type { Attachment, ImageRef, VideoRef } from "@/lib/types";

export type FormState = {
  error?: string;
  /** 입력 칸 이름별 오류 문구 */
  fields?: Record<string, string>;
};

const MAX_TOURNAMENT_IMAGES = 20;
const MAX_NEWS_IMAGES = 20;
const MAX_ATTACHMENTS = 10;
const MAX_ALBUM_PHOTOS = 300;
const MAX_ALBUM_VIDEOS = 150;

// ───────────────────────── 로그인 ─────────────────────────

// 비밀번호를 계속 틀리면 잠시 로그인을 막습니다. (서버를 다시 켜면 초기화)
const LOCK_AFTER = 8;
const LOCK_WINDOW_MS = 10 * 60 * 1000;
let failures = { count: 0, since: 0 };

export async function loginAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isAdminConfigured()) {
    return { error: "관리자 비밀번호가 아직 설정되지 않았습니다." };
  }

  const now = Date.now();
  if (now - failures.since > LOCK_WINDOW_MS) failures = { count: 0, since: now };
  if (failures.count >= LOCK_AFTER) {
    return { error: "로그인 시도가 너무 많습니다. 10분 뒤에 다시 시도해 주세요." };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !verifyPassword(password)) {
    failures.count += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  failures = { count: 0, since: now };
  await createSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

// ───────────────────────── 공통 ─────────────────────────

/** 저장·삭제 전에 권한을 확인합니다. 문제가 있으면 안내 문구를 돌려줍니다. */
async function writeBlocker(): Promise<string | null> {
  if (!(await isAdmin())) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  return null;
}

function text(formData: FormData, key: string, max: number): string {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.replace(/\r\n?/g, "\n").trim().slice(0, max);
}

function jsonList(formData: FormData, key: string): unknown[] | null {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const isDimension = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0 && value < 100_000;

function parseImages(list: unknown[] | null, max: number): ImageRef[] | null {
  if (!list || list.length > max) return null;
  const images: ImageRef[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) return null;
    const { src, width, height } = item as Record<string, unknown>;
    if (!isUploadUrl(src)) return null;
    images.push(
      isDimension(width) && isDimension(height) ? { src, width, height } : { src },
    );
  }
  return images;
}

/** 앨범의 동영상 목록. 동영상과 대표 화면 모두 갤러리 폴더에 올린 파일이어야 합니다. */
function parseVideos(list: unknown[] | null, max: number): VideoRef[] | null {
  if (!list || list.length > max) return null;
  const videos: VideoRef[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) return null;
    const { src, poster, width, height } = item as Record<string, unknown>;
    if (!isUploadUrl(src, "gallery") || mediaTypeOf(src) !== "video") return null;
    const hasPoster = isUploadUrl(poster, "gallery") && mediaTypeOf(poster) === "image";
    if (poster !== undefined && !hasPoster) return null;
    videos.push({
      src,
      ...(hasPoster ? { poster } : {}),
      ...(isDimension(width) && isDimension(height) ? { width, height } : {}),
    });
  }
  return videos;
}

function parseAttachments(list: unknown[] | null): Attachment[] | null {
  if (!list || list.length > MAX_ATTACHMENTS) return null;
  const files: Attachment[] = [];
  for (const item of list) {
    if (typeof item !== "object" || item === null) return null;
    const { name, url, size } = item as Record<string, unknown>;
    if (!isUploadUrl(url) || typeof name !== "string" || !name.trim()) return null;
    files.push({
      name: name.trim().slice(0, 200),
      url,
      ...(typeof size === "number" && size > 0 ? { size } : {}),
    });
  }
  return files;
}

/** 입력 화면의 '방문자에게 숨기기' 체크 여부 */
const isHiddenChecked = (formData: FormData) => formData.get("hidden") === "on";

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 입력 화면의 '영어 화면용' 칸(이름이 en_ 으로 시작)을 읽습니다.
 * limits 는 칸 이름별 글자 수 한도입니다. 채운 칸만 묶어 돌려주고, 모두 비어 있으면 undefined 입니다.
 */
function englishFields<K extends string>(
  formData: FormData,
  limits: Record<K, number>,
): Partial<Record<K, string>> | undefined {
  const filled: Partial<Record<K, string>> = {};
  for (const key of Object.keys(limits) as K[]) {
    const value = text(formData, `en_${key}`, limits[key]);
    if (value) filled[key] = value;
  }
  return Object.keys(filled).length > 0 ? filled : undefined;
}

function revalidateSite() {
  // 홈·목록·상세 등 모든 페이지를 새 내용으로 다시 만들게 합니다.
  revalidatePath("/", "layout");
}

// ───────────────────────── 대회 정보 ─────────────────────────

function parseTournament(
  formData: FormData,
): { value: TournamentInput } | { fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const title = text(formData, "title", 150);
  if (!title) fields.title = "대회 이름을 입력해 주세요.";

  const startDate = text(formData, "startDate", 10);
  if (!isValidDate(startDate)) fields.startDate = "시작 날짜를 선택해 주세요.";

  const endDate = text(formData, "endDate", 10);
  if (endDate && !isValidDate(endDate)) {
    fields.endDate = "종료 날짜가 올바르지 않습니다.";
  } else if (endDate && !fields.startDate && endDate < startDate) {
    fields.endDate = "종료 날짜가 시작 날짜보다 빠릅니다.";
  }

  const startTime = text(formData, "startTime", 5);
  const endTime = text(formData, "endTime", 5);
  if (startTime && !TIME_RE.test(startTime)) {
    fields.startTime = "시작 시간이 올바르지 않습니다.";
  }
  if (endTime && !TIME_RE.test(endTime)) {
    fields.endTime = "종료 시간이 올바르지 않습니다.";
  } else if (endTime && !startTime) {
    fields.startTime = "시작 시간도 함께 입력해 주세요.";
  } else if (
    endTime &&
    !fields.startTime &&
    (!endDate || endDate === startDate) &&
    endTime <= startTime
  ) {
    fields.endTime = "종료 시간이 시작 시간보다 늦어야 합니다.";
  }

  const deadline = text(formData, "deadline", 10);
  if (deadline && !isValidDate(deadline)) {
    fields.deadline = "신청 마감일이 올바르지 않습니다.";
  }

  const linkUrl = text(formData, "linkUrl", 500);
  if (linkUrl && !isHttpUrl(linkUrl)) {
    fields.linkUrl = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  }

  const images = parseImages(jsonList(formData, "images"), MAX_TOURNAMENT_IMAGES);
  if (!images) fields.images = "이미지 정보를 읽지 못했습니다. 다시 올려 주세요.";

  const attachments = parseAttachments(jsonList(formData, "attachments"));
  if (!attachments) fields.attachments = "첨부 파일 정보를 읽지 못했습니다. 다시 올려 주세요.";

  if (!images || !attachments || Object.keys(fields).length > 0) return { fields };

  const value: TournamentInput = { title, startDate, images, attachments };
  const optional = {
    startTime,
    endDate,
    endTime,
    venue: text(formData, "venue", 150),
    address: text(formData, "address", 250),
    organizer: text(formData, "organizer", 150),
    fee: text(formData, "fee", 150),
    deadline,
    contact: text(formData, "contact", 300),
    summary: text(formData, "summary", 500),
    body: text(formData, "body", 30_000),
    fullText: text(formData, "fullText", 30_000),
    linkUrl,
    linkLabel: linkUrl ? text(formData, "linkLabel", 40) : "",
  };
  for (const [key, entry] of Object.entries(optional)) {
    if (entry) value[key as keyof typeof optional] = entry;
  }
  // 영어 화면용 글. 한국어 칸과 같은 한도를 씁니다. 링크가 없으면 버튼 이름은 읽지 않습니다.
  const en = englishFields(formData, {
    title: 150,
    summary: 500,
    venue: 150,
    organizer: 150,
    fee: 150,
    contact: 300,
    body: 30_000,
    fullText: 30_000,
    linkLabel: linkUrl ? 40 : 0,
  });
  if (en) value.en = en;
  if (isHiddenChecked(formData)) value.hidden = true;
  return { value };
}

/** id 가 null 이면 새로 등록, 있으면 그 대회를 수정합니다. */
export async function saveTournamentAction(
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };

  const parsed = parseTournament(formData);
  if ("fields" in parsed) {
    return { error: "입력 내용을 다시 확인해 주세요.", fields: parsed.fields };
  }

  const saved = id
    ? await updateTournament(id, parsed.value)
    : await createTournament(parsed.value);
  if (!saved) return { error: "수정하려는 대회를 찾을 수 없습니다." };

  revalidateSite();
  redirect(`/admin/tournaments?saved=${encodeURIComponent(saved.id)}`);
}

export async function deleteTournamentAction(id: string): Promise<void> {
  if (await writeBlocker()) redirect("/admin");
  await deleteTournament(id);
  revalidateSite();
  redirect("/admin/tournaments?deleted=1");
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. 관리자 목록은 그 자리에서 새로 그려집니다. */
export async function setTournamentHiddenAction(id: string, hidden: boolean): Promise<void> {
  if (await writeBlocker()) redirect("/admin");
  if (typeof id !== "string" || typeof hidden !== "boolean") return;
  await setTournamentHidden(id, hidden);
  revalidateSite();
}

// ───────────────────────── 갤러리 ─────────────────────────

/** id 가 null 이면 새 앨범, 있으면 그 앨범을 수정합니다. */
export async function saveAlbumAction(
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };

  const fields: Record<string, string> = {};
  const title = text(formData, "title", 150);
  if (!title) fields.title = "앨범 이름을 입력해 주세요.";
  const date = text(formData, "date", 10);
  if (!isValidDate(date)) fields.date = "행사 날짜를 선택해 주세요.";
  const photos = parseImages(jsonList(formData, "photos"), MAX_ALBUM_PHOTOS);
  if (!photos) fields.photos = "사진 정보를 읽지 못했습니다. 다시 올려 주세요.";
  const videos = parseVideos(jsonList(formData, "videos"), MAX_ALBUM_VIDEOS);
  if (!videos) fields.videos = "동영상 정보를 읽지 못했습니다. 다시 올려 주세요.";
  if (!photos || !videos || Object.keys(fields).length > 0) {
    return { error: "입력 내용을 다시 확인해 주세요.", fields };
  }

  const description = text(formData, "description", 1000);
  const en = englishFields(formData, { title: 150, description: 1000 });
  const input: AlbumInput = {
    title,
    date,
    photos,
    ...(videos.length > 0 ? { videos } : {}),
    ...(description ? { description } : {}),
    ...(en ? { en } : {}),
    ...(isHiddenChecked(formData) ? { hidden: true } : {}),
  };
  const saved = id ? await updateAlbum(id, input) : await createAlbum(input);
  if (!saved) return { error: "수정하려는 앨범을 찾을 수 없습니다." };

  revalidateSite();
  redirect(`/admin/albums?saved=${encodeURIComponent(saved.id)}`);
}

export async function deleteAlbumAction(id: string): Promise<void> {
  if (await writeBlocker()) redirect("/admin");
  await deleteAlbum(id);
  revalidateSite();
  redirect("/admin/albums?deleted=1");
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. 관리자 목록은 그 자리에서 새로 그려집니다. */
export async function setAlbumHiddenAction(id: string, hidden: boolean): Promise<void> {
  if (await writeBlocker()) redirect("/admin");
  if (typeof id !== "string" || typeof hidden !== "boolean") return;
  await setAlbumHidden(id, hidden);
  revalidateSite();
}

// ───────────────────────── 탁구 소식 ─────────────────────────

/** id 가 null 이면 새로 등록, 있으면 그 소식을 수정합니다. */
export async function saveNewsPostAction(
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };

  const fields: Record<string, string> = {};
  const title = text(formData, "title", 150);
  if (!title) fields.title = "제목을 입력해 주세요.";
  const date = text(formData, "date", 10);
  if (!isValidDate(date)) fields.date = "날짜를 선택해 주세요.";
  const linkUrl = text(formData, "linkUrl", 500);
  if (linkUrl && !isHttpUrl(linkUrl)) {
    fields.linkUrl = "http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.";
  }
  const images = parseImages(jsonList(formData, "images"), MAX_NEWS_IMAGES);
  if (!images) fields.images = "이미지 정보를 읽지 못했습니다. 다시 올려 주세요.";
  const attachments = parseAttachments(jsonList(formData, "attachments"));
  if (!attachments) fields.attachments = "첨부 파일 정보를 읽지 못했습니다. 다시 올려 주세요.";
  if (!images || !attachments || Object.keys(fields).length > 0) {
    return { error: "입력 내용을 다시 확인해 주세요.", fields };
  }

  const source = text(formData, "source", 100);
  const body = text(formData, "body", 30_000);
  const en = englishFields(formData, { title: 150, source: 100, body: 30_000 });
  const input: NewsPostInput = {
    title,
    date,
    images,
    attachments,
    ...(source ? { source } : {}),
    ...(linkUrl ? { linkUrl } : {}),
    ...(body ? { body } : {}),
    ...(en ? { en } : {}),
    ...(isHiddenChecked(formData) ? { hidden: true } : {}),
  };
  const saved = id ? await updateNewsPost(id, input) : await createNewsPost(input);
  if (!saved) return { error: "수정하려는 소식을 찾을 수 없습니다." };

  revalidateSite();
  redirect(`/admin/news?saved=${encodeURIComponent(saved.id)}`);
}

export async function deleteNewsPostAction(id: string): Promise<void> {
  if (await writeBlocker()) redirect("/admin");
  await deleteNewsPost(id);
  revalidateSite();
  redirect("/admin/news?deleted=1");
}

/** 방문자에게 숨길지(true) 보일지(false) 정합니다. 관리자 목록은 그 자리에서 새로 그려집니다. */
export async function setNewsPostHiddenAction(id: string, hidden: boolean): Promise<void> {
  if (await writeBlocker()) redirect("/admin");
  if (typeof id !== "string" || typeof hidden !== "boolean") return;
  await setNewsPostHidden(id, hidden);
  revalidateSite();
}

// ───────────────────────── 메인 화면 ─────────────────────────

/** 올려 둔 동영상·이미지를 홈 화면 맨 위 슬라이드의 마지막 순서로 등록합니다. */
export async function addHeroMediaAction(input: {
  title: string;
  src: string;
  width?: number;
  height?: number;
}): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };

  const { title, src, width, height } = (input ?? {}) as Record<string, unknown>;
  const unreadable = { error: "파일 정보를 읽지 못했습니다. 다시 올려 주세요." };
  if (!isUploadUrl(src, "hero")) return unreadable;
  const type = mediaTypeOf(src);
  if (!type) return unreadable;

  const saved = await addHeroMedia({
    title: typeof title === "string" ? title.trim().slice(0, 150) : "",
    type,
    src,
    ...(isDimension(width) && isDimension(height) ? { width, height } : {}),
    active: true,
  });
  if (!saved) {
    // 등록하지 못한 파일이 저장소에 남지 않게 지웁니다.
    await removeUploads([src]);
    return { error: `메인 화면에는 최대 ${MAX_HERO_MEDIA}개까지 올릴 수 있습니다.` };
  }

  revalidateSite();
  return {};
}

const HERO_NOT_FOUND = "항목을 찾을 수 없습니다. 화면을 새로 고쳐 주세요.";

/** 홈 화면에 보일지(true) 숨길지(false) 정합니다. */
export async function setHeroMediaActiveAction(
  id: string,
  active: boolean,
): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };
  if (typeof id !== "string" || typeof active !== "boolean") return { error: HERO_NOT_FOUND };
  if (!(await setHeroMediaActive(id, active))) return { error: HERO_NOT_FOUND };
  revalidateSite();
  return {};
}

export async function moveHeroMediaAction(
  id: string,
  direction: "up" | "down",
): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };
  if (typeof id !== "string" || (direction !== "up" && direction !== "down")) {
    return { error: HERO_NOT_FOUND };
  }
  await moveHeroMedia(id, direction === "up" ? -1 : 1);
  revalidateSite();
  return {};
}

export async function deleteHeroMediaAction(id: string): Promise<FormState> {
  const blocked = await writeBlocker();
  if (blocked) return { error: blocked };
  if (typeof id !== "string" || !(await deleteHeroMedia(id))) {
    return { error: HERO_NOT_FOUND };
  }
  revalidateSite();
  return {};
}
