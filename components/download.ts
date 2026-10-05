// 방문자의 브라우저에서 사진을 내려받는 함수들입니다.

export type DownloadFile = {
  src: string;
  /** 확장자를 뺀 저장 이름 */
  name: string;
};

/** 한꺼번에 받아 오는 사진 수. 너무 많이 동시에 받으면 휴대폰에서 느려집니다. */
const CONCURRENCY = 4;

/** 파일 이름에 쓸 수 없는 글자를 빼고 너무 길지 않게 줄입니다. */
function safeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 80).trim() || "photos";
}

function extensionOf(src: string): string {
  return /\.([a-z0-9]+)$/i.exec(src.split(/[?#]/)[0])?.[1].toLowerCase() ?? "jpg";
}

async function fetchBlob(src: string): Promise<Blob> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`${src}: ${response.status}`);
  return response.blob();
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 내려받기가 시작되기 전에 주소를 지우면 실패하는 브라우저가 있어 조금 뒤에 정리합니다.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * 사진을 내려받습니다. 한 장이면 그 파일 그대로, 여러 장이면 ZIP 파일 하나로 묶습니다.
 * 받아 오지 못한 사진의 수를 돌려주고, 한 장도 받지 못했으면 오류를 던집니다.
 */
export async function downloadPhotos(
  files: DownloadFile[],
  zipName: string,
  onProgress: (done: number) => void,
): Promise<number> {
  const filenameOf = (file: DownloadFile) => `${safeName(file.name)}.${extensionOf(file.src)}`;

  if (files.length === 1) {
    saveBlob(await fetchBlob(files[0].src), filenameOf(files[0]));
    onProgress(1);
    return 0;
  }

  // ZIP 을 만드는 코드는 실제로 내려받을 때만 불러옵니다.
  const { default: JSZip } = await import("jszip");
  const blobs: (Blob | null)[] = files.map(() => null);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      // 받아 오지 못한 사진은 비워 두고 나머지를 계속 받습니다.
      blobs[index] = await fetchBlob(files[index].src).catch(() => null);
      onProgress(++done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));

  // 먼저 도착한 순서가 아니라 고른 순서대로 담습니다.
  const zip = new JSZip();
  let failed = 0;
  blobs.forEach((blob, index) => {
    if (blob) zip.file(filenameOf(files[index]), blob);
    else failed += 1;
  });
  if (failed === files.length) throw new Error("사진을 한 장도 받아 오지 못했습니다.");

  saveBlob(await zip.generateAsync({ type: "blob" }), `${safeName(zipName)}.zip`);
  return failed;
}
