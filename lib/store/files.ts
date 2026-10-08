import "server-only";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { bucket, publicBase } from "./supabase";

// 업로드한 파일은 Supabase Storage 의 공개 버킷(uploads)에 저장합니다.
// 대회·앨범 같은 내용에는 파일이 열리는 주소 전체를 적어 둡니다.
// (예: https://….supabase.co/storage/v1/object/public/uploads/tournaments/abc.jpg)

export const UPLOAD_FOLDERS = ["tournaments", "gallery", "hero", "news"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
export type UploadKind = "image" | "document" | "video";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** 홈 화면에서 자동으로 재생되는 동영상이라 50MB 까지만 받습니다. 버킷에도 같은 한도를 걸어 두었습니다. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** 파일 이름이 겹치지 않아 내용이 바뀔 일이 없으므로 브라우저가 1년 동안 다시 받지 않게 합니다. (초) */
const CACHE_SECONDS = "31536000";

const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const DOCUMENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".hwp": "application/x-hwp",
  ".hwpx": "application/hwp+zip",
  ".txt": "text/plain; charset=utf-8",
};

// 휴대폰·컴퓨터 브라우저에서 두루 재생되는 형식만 받습니다.
const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const ATTACHMENT_TYPES = { ...IMAGE_TYPES, ...DOCUMENT_TYPES };

const UPLOAD_RULES: Record<
  UploadKind,
  { types: Record<string, string>; maxBytes: number; allowed: string }
> = {
  image: {
    types: IMAGE_TYPES,
    maxBytes: MAX_UPLOAD_BYTES,
    allowed: "JPG, PNG, WEBP, GIF 이미지만 올릴 수 있습니다.",
  },
  document: {
    types: ATTACHMENT_TYPES,
    maxBytes: MAX_UPLOAD_BYTES,
    allowed: "PDF, 문서(DOC, XLS, PPT, HWP), 이미지 파일만 올릴 수 있습니다.",
  },
  video: {
    types: VIDEO_TYPES,
    maxBytes: MAX_VIDEO_BYTES,
    allowed: "MP4, WEBM 동영상만 올릴 수 있습니다.",
  },
};

/** 파일 이름의 확장자로 이미지인지 동영상인지 구분합니다. 둘 다 아니면 null */
export function mediaTypeOf(filename: string): "image" | "video" | null {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_TYPES[ext]) return "image";
  if (VIDEO_TYPES[ext]) return "video";
  return null;
}

/**
 * 파일 주소에서 버킷 안의 위치("tournaments/abc.jpg")를 꺼냅니다.
 * 이 사이트가 올린 파일의 주소가 아니면 null
 */
function objectPath(url: string): string | null {
  const base = publicBase();
  if (!url.startsWith(base)) return null;
  const rest = url.slice(base.length);
  return /^(tournaments|gallery|hero|news)\/[A-Za-z0-9._-]+$/.test(rest) && !rest.includes("..")
    ? rest
    : null;
}

/** 저장 가능한 업로드 주소인지(형식만) 확인합니다. folder 를 주면 그 폴더의 파일만 통과합니다. */
export function isUploadUrl(url: unknown, folder?: UploadFolder): url is string {
  if (typeof url !== "string") return false;
  const location = objectPath(url);
  return location !== null && (!folder || location.startsWith(`${folder}/`));
}

export class UploadError extends Error {}

/** 올려도 되는 파일인지 확인하고, 버킷 안에 저장할 위치와 파일 형식을 정합니다. */
function planUpload(
  folder: UploadFolder,
  kind: UploadKind,
  filename: string,
  size: number,
): { location: string; contentType: string } {
  const rule = UPLOAD_RULES[kind];
  if (kind === "video" && folder !== "hero") {
    throw new UploadError("동영상은 메인 화면에만 올릴 수 있습니다.");
  }
  if (!(size > 0)) throw new UploadError("빈 파일입니다.");
  if (size > rule.maxBytes) {
    throw new UploadError(
      `파일이 너무 큽니다. (최대 ${rule.maxBytes / 1024 / 1024}MB)`,
    );
  }
  const ext = path.extname(filename).toLowerCase();
  const contentType = rule.types[ext];
  if (!contentType) throw new UploadError(rule.allowed);

  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}${ext === ".jpeg" ? ".jpg" : ext}`;
  return { location: `${folder}/${name}`, contentType };
}

export type UploadTicket = {
  /** 파일을 보낼 일회용 주소 (2시간 동안 한 번만 쓸 수 있습니다) */
  uploadUrl: string;
  contentType: string;
  /** 올린 뒤 파일이 열리는 주소 */
  url: string;
  name: string;
  size: number;
};

/**
 * 관리자 브라우저가 Supabase 로 파일을 바로 보낼 수 있는 일회용 주소를 발급합니다.
 * 배포된 서버(Vercel)는 4.5MB 가 넘는 요청을 받지 못하므로 파일은 서버를 거치지 않습니다.
 * size 는 브라우저가 알려 준 값이고, 실제 크기는 버킷의 한도(50MB)가 막습니다.
 */
export async function createUpload(
  folder: UploadFolder,
  kind: UploadKind,
  filename: string,
  size: number,
): Promise<UploadTicket> {
  const { location, contentType } = planUpload(folder, kind, filename, size);
  const { data, error } = await bucket().createSignedUploadUrl(location);
  if (error) throw new Error(`업로드 주소를 만들지 못했습니다: ${error.message}`);

  return {
    uploadUrl: data.signedUrl,
    contentType,
    url: publicBase() + location,
    name: filename.normalize("NFC"),
    size,
  };
}

/** 서버에서 파일을 바로 올립니다. 스크립트로 대회·소식을 등록할 때 씁니다. */
export async function saveUpload(
  folder: UploadFolder,
  file: File,
  kind: UploadKind,
): Promise<{ url: string; name: string; size: number }> {
  const { location, contentType } = planUpload(folder, kind, file.name, file.size);
  const { error } = await bucket().upload(location, await file.arrayBuffer(), {
    contentType,
    cacheControl: CACHE_SECONDS,
  });
  if (error) throw new Error(`${file.name} 을(를) 올리지 못했습니다: ${error.message}`);

  return {
    url: publicBase() + location,
    name: file.name.normalize("NFC"),
    size: file.size,
  };
}

/**
 * 더 이상 쓰지 않는 업로드 파일을 지웁니다. 없는 파일은 조용히 넘어갑니다.
 * 지우지 못해도 파일이 남을 뿐이므로, 이미 끝난 저장·삭제를 실패로 만들지 않고 기록만 남깁니다.
 */
export async function removeUploads(urls: string[]): Promise<void> {
  const locations = urls.map(objectPath).filter((location) => location !== null);
  if (locations.length === 0) return;
  const { error } = await bucket().remove(locations);
  if (error) console.error(`업로드 파일을 지우지 못했습니다: ${error.message}`, locations);
}
