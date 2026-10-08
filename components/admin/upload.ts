import type { Attachment, ImageRef, VideoRef } from "@/lib/types";

// 관리자 화면(브라우저)에서 파일을 저장소(Supabase)로 올리는 함수들입니다.

export type UploadFolder = "tournaments" | "gallery" | "hero" | "news";

/** 올리기 전에 줄여 둘 긴 변의 최대 길이(px) */
const MAX_DIMENSION = 1600;
/** 이보다 작고 크기도 작은 이미지는 다시 압축하지 않고 그대로 올립니다. */
const KEEP_ORIGINAL_BYTES = 800 * 1024;
/** 동영상 한 개의 최대 크기(MB). 서버(lib/store/files.ts)의 한도와 같게 둡니다. */
export const MAX_VIDEO_MB = 50;
/** 동영상 대표 화면의 긴 변 최대 길이(px) */
const POSTER_DIMENSION = 960;
/** 대표 화면을 잡으려고 동영상을 읽는 데 기다리는 시간(ms) */
const POSTER_TIMEOUT_MS = 8000;
/** 브라우저가 올린 파일을 다시 받지 않고 보관하는 시간(초). 서버(lib/store/files.ts)와 같게 둡니다. */
const CACHE_SECONDS = "31536000";

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
  // 1) 서버에서 로그인과 파일 종류·크기를 확인받고, 파일을 보낼 일회용 주소를 받습니다.
  const response = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, kind, name: filename, size: file.size }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? String(result.error)
        : "파일을 올리지 못했습니다.";
    throw new Error(`${filename}: ${message}`);
  }
  const ticket = result as {
    uploadUrl: string;
    contentType: string;
    url: string;
    name: string;
    size: number;
  };

  // 2) 파일은 서버를 거치지 않고 Supabase 로 바로 보냅니다.
  //    (배포된 서버는 4.5MB 가 넘는 요청을 받지 못합니다)
  const body = new FormData();
  body.set("cacheControl", CACHE_SECONDS);
  // 파일 형식은 브라우저가 짐작한 값이 아니라 서버가 확장자로 정한 값을 씁니다.
  body.set("", file.slice(0, file.size, ticket.contentType));
  const uploaded = await fetch(ticket.uploadUrl, { method: "PUT", body }).catch(() => null);
  if (!uploaded?.ok) throw new Error(`${filename}: 파일을 올리지 못했습니다.`);

  return { url: ticket.url, name: ticket.name, size: ticket.size };
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

function checkVideoSize(file: File) {
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    throw new Error(
      `${file.name}: 동영상이 너무 큽니다. ${MAX_VIDEO_MB}MB 이하로 줄여서 올려 주세요.`,
    );
  }
}

/** 메인 화면에 쓸 동영상을 그대로 올립니다. (브라우저에서는 동영상을 줄일 수 없습니다) */
export async function uploadVideo(file: File): Promise<{ src: string }> {
  checkVideoSize(file);
  const { url } = await send(file, file.name, "hero", "video");
  return { src: url };
}

type Poster = { blob: Blob; width: number; height: number };

/**
 * 동영상에서 대표 화면으로 쓸 한 장면을 잡습니다. width·height 는 동영상의 원래 크기입니다.
 * 이 브라우저가 읽지 못하는 동영상이면 null
 */
function capturePoster(file: File): Promise<Poster | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const timer = setTimeout(() => finish(null), POSTER_TIMEOUT_MS);
    function finish(poster: Poster | null) {
      clearTimeout(timer);
      // 정리하는 동안 생기는 이벤트로 다시 불리지 않게 합니다.
      video.onerror = video.onloadeddata = video.onseeked = null;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(poster);
    }

    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onerror = () => finish(null);
    // 맨 처음 장면은 검거나 흔들릴 때가 많아 조금 뒤(1초, 짧은 동영상은 가운데)의 장면을 씁니다.
    video.onloadeddata = () => {
      const middle = video.duration / 2;
      video.currentTime = Number.isFinite(middle) && middle > 0 ? Math.min(1, middle) : 0.1;
    };
    video.onseeked = () => {
      const { videoWidth: width, videoHeight: height } = video;
      const scale = Math.min(1, POSTER_DIMENSION / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext("2d");
      if (!context || !canvas.width || !canvas.height) return finish(null);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => finish(blob ? { blob, width, height } : null),
        "image/jpeg",
        0.8,
      );
    };
    video.src = url;
  });
}

/**
 * 앨범에 넣을 동영상을 그대로 올리고, 재생하기 전에 보여 줄 대표 화면도 함께 올립니다.
 * 대표 화면을 만들지 못하면 동영상만 올립니다.
 */
export async function uploadAlbumVideo(file: File): Promise<VideoRef> {
  checkVideoSize(file);
  const poster = await capturePoster(file);
  const { url: src } = await send(file, file.name, "gallery", "video");
  if (!poster) return { src };

  const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
  const uploaded = await send(poster.blob, name, "gallery", "image").catch(() => null);
  return {
    src,
    ...(uploaded ? { poster: uploaded.url } : {}),
    width: poster.width,
    height: poster.height,
  };
}
