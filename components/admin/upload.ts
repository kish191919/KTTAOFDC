import type { Attachment, ImageRef } from "@/lib/types";

// 관리자 화면(브라우저)에서 파일을 서버로 올리는 함수들입니다.

export type UploadFolder = "tournaments" | "gallery" | "hero" | "news";

/** 올리기 전에 줄여 둘 긴 변의 최대 길이(px) */
const MAX_DIMENSION = 1600;
/** 이보다 작고 크기도 작은 이미지는 다시 압축하지 않고 그대로 올립니다. */
const KEEP_ORIGINAL_BYTES = 800 * 1024;
/** 동영상 한 개의 최대 크기(MB). 서버(lib/store/files.ts)의 한도와 같게 둡니다. */
export const MAX_VIDEO_MB = 50;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`'${file.name}' 을(를) 이미지로 읽을 수 없습니다.`));
    };
    image.src = url;
  });
}

async function send(
  file: Blob,
  filename: string,
  folder: UploadFolder,
  kind: "image" | "document" | "video",
): Promise<{ url: string; name: string; size: number }> {
  const body = new FormData();
  body.set("file", file, filename);
  body.set("folder", folder);
  body.set("kind", kind);

  const response = await fetch("/api/admin/upload", { method: "POST", body });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? String(result.error)
        : "파일을 올리지 못했습니다.";
    throw new Error(`${filename}: ${message}`);
  }
  return result as { url: string; name: string; size: number };
}

/**
 * 이미지를 올립니다. 휴대폰 사진처럼 큰 이미지는 브라우저에서 먼저
 * 긴 변 1600px 의 JPG 로 줄여서 저장 공간과 로딩 시간을 아낍니다.
 * (화면 가득 보여 주는 메인 화면 이미지는 maxDimension 을 더 크게 줍니다.)
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
  maxDimension = MAX_DIMENSION,
): Promise<ImageRef> {
  const image = await loadImage(file);
  const { naturalWidth: width, naturalHeight: height } = image;
  const scale = Math.min(1, maxDimension / Math.max(width, height));

  // 움직이는 GIF 와 이미 충분히 작은 이미지는 원본 그대로 올립니다.
  const keepOriginal =
    file.type === "image/gif" || (scale === 1 && file.size <= KEEP_ORIGINAL_BYTES);
  if (keepOriginal) {
    const { url } = await send(file, file.name, folder, "image");
    return { src: url, width, height };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("이 브라우저에서는 이미지를 처리할 수 없습니다.");
  // 투명한 PNG 가 검게 변하지 않도록 흰 바탕을 먼저 칠합니다.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.86),
  );
  if (!blob) throw new Error(`'${file.name}' 을(를) 변환하지 못했습니다.`);

  const filename = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  const { url } = await send(blob, filename, folder, "image");
  return { src: url, width: canvas.width, height: canvas.height };
}

/** PDF·문서 같은 첨부 파일을 그대로 올립니다. */
export async function uploadDocument(
  file: File,
  folder: UploadFolder,
): Promise<Attachment> {
  const { url, name, size } = await send(file, file.name, folder, "document");
  return { url, name, size };
}

/** 메인 화면에 쓸 동영상을 그대로 올립니다. (브라우저에서는 동영상을 줄일 수 없습니다) */
export async function uploadVideo(file: File): Promise<{ src: string }> {
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(
      `${file.name}: 동영상이 너무 큽니다. ${MAX_VIDEO_MB}MB 이하로 줄여서 올려 주세요.`,
    );
  }
  const { url } = await send(file, file.name, "hero", "video");
  return { src: url };
}
