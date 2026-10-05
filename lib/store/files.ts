import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

// 업로드한 파일은 public/uploads 아래에 저장합니다.
// 나중에 Vercel Blob·Supabase Storage 등으로 바꿀 때는 이 파일만 교체하면 됩니다.

export const UPLOAD_PREFIX = "/uploads/";
export const UPLOAD_FOLDERS = ["tournaments", "gallery", "hero", "news"] as const;
export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];
export type UploadKind = "image" | "document" | "video";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** 동영상도 git 에 함께 올리므로 GitHub 이 경고 없이 받는 크기(50MB)까지만 받습니다. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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
const ALL_TYPES = { ...ATTACHMENT_TYPES, ...VIDEO_TYPES };

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

export function contentTypeFor(filename: string): string | null {
  return ALL_TYPES[path.extname(filename).toLowerCase()] ?? null;
}

/** 파일 이름의 확장자로 이미지인지 동영상인지 구분합니다. 둘 다 아니면 null */
export function mediaTypeOf(filename: string): "image" | "video" | null {
  const ext = path.extname(filename).toLowerCase();
  if (IMAGE_TYPES[ext]) return "image";
  if (VIDEO_TYPES[ext]) return "video";
  return null;
}

function uploadRoot(): string {
  return path.join(process.cwd(), "public", "uploads");
}

/** "/uploads/..." 주소를 실제 파일 경로로 바꿉니다. uploads 폴더 밖을 가리키면 null */
export function resolveUpload(url: string): string | null {
  if (!url.startsWith(UPLOAD_PREFIX)) return null;
  let relative: string;
  try {
    relative = decodeURIComponent(url.slice(UPLOAD_PREFIX.length));
  } catch {
    return null;
  }
  if (relative.includes("\0")) return null;
  const root = uploadRoot();
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

/** 저장 가능한 업로드 주소인지(형식만) 확인합니다. folder 를 주면 그 폴더의 파일만 통과합니다. */
export function isUploadUrl(url: unknown, folder?: UploadFolder): url is string {
  return (
    typeof url === "string" &&
    /^\/uploads\/(tournaments|gallery|hero|news)\/[A-Za-z0-9._-]+$/.test(url) &&
    !url.includes("..") &&
    (!folder || url.startsWith(`${UPLOAD_PREFIX}${folder}/`))
  );
}

export class UploadError extends Error {}

export async function saveUpload(
  folder: UploadFolder,
  file: File,
  kind: UploadKind,
): Promise<{ url: string; name: string; size: number }> {
  const rule = UPLOAD_RULES[kind];
  if (kind === "video" && folder !== "hero") {
    throw new UploadError("동영상은 메인 화면에만 올릴 수 있습니다.");
  }
  if (file.size === 0) throw new UploadError("빈 파일입니다.");
  if (file.size > rule.maxBytes) {
    throw new UploadError(
      `파일이 너무 큽니다. (최대 ${rule.maxBytes / 1024 / 1024}MB)`,
    );
  }
  const ext = path.extname(file.name).toLowerCase();
  if (!rule.types[ext]) throw new UploadError(rule.allowed);

  const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}${ext === ".jpeg" ? ".jpg" : ext}`;
  const dir = path.join(uploadRoot(), folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return {
    url: `${UPLOAD_PREFIX}${folder}/${name}`,
    name: file.name.normalize("NFC"),
    size: file.size,
  };
}

/** 더 이상 쓰지 않는 업로드 파일을 지웁니다. 없는 파일은 조용히 넘어갑니다. */
export async function removeUploads(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      const target = resolveUpload(url);
      if (!target) return;
      await fs.rm(target, { force: true });
    }),
  );
}
