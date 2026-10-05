import type { Attachment } from "@/lib/types";
import { DownloadIcon, FileIcon } from "@/components/icons";

function formatSize(bytes?: number) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/** 내려받을 수 있는 첨부 파일 목록 */
export function AttachmentList({ files }: { files: Attachment[] }) {
  return (
    <ul className="space-y-2.5">
      {files.map((file) => (
        <li key={file.url}>
          <a
            href={file.url}
            download={file.name}
            className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <FileIcon className="size-5 shrink-0 text-brand-700" />
            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
              {file.name}
            </span>
            <span className="shrink-0 text-sm text-slate-400">{formatSize(file.size)}</span>
            <DownloadIcon className="size-4 shrink-0 text-slate-400 group-hover:text-brand-700" />
          </a>
        </li>
      ))}
    </ul>
  );
}
