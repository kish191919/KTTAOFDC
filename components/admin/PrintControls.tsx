"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { drawAdminAction } from "@/lib/actions";
import { STALE_PRINT, type PrintedRequest } from "@/lib/draw/sheets";
import { setPrintStamp } from "@/components/draw/PrintStamp";
import { PrinterIcon } from "@/components/icons";

type Props = {
  tournamentId: string;
  /** 이 페이지에 찍힌 기록지들. 인쇄할 때 서버가 지금 대진표와 같은지 확인하고 뽑은 기록을 남깁니다. */
  sheets: PrintedRequest[];
  /** false 면 기록을 남기지 않고 인쇄만 합니다. (마감한 대진표) */
  record: boolean;
};

type Notice = { tone: "error" | "info"; text: string };

/**
 * 기록지 인쇄 단추. 누르면 먼저 서버에 이 페이지의 기록지가 지금 대진표와 같은지 묻고,
 * 같으면 뽑은 기록(종목의 printed)을 남긴 뒤 인쇄 창을 엽니다. 그 사이 대진표가 바뀌었으면 인쇄하지 않고 새 내용을 불러옵니다.
 * 단추 대신 브라우저 메뉴(Ctrl+P)로 인쇄해도 인쇄 창을 닫은 뒤 같은 확인을 하고 결과를 알려 줍니다.
 */
export function PrintControls({ tournamentId, sheets, record }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  // 단추로 연 인쇄 창인지. 브라우저 메뉴로 연 인쇄는 창을 닫은 뒤에 기록합니다.
  const fromButton = useRef(false);
  const menuPrintAt = useRef<string | null>(null);
  // 이벤트 처리기가 늘 최신 값을 쓰도록 둡니다.
  const latest = useRef({ sheets, record, tournamentId });
  useEffect(() => {
    latest.current = { sheets, record, tournamentId };
  });

  /** 뽑은 기록을 남깁니다. 종이가 지금 대진표와 다르면 새 내용을 불러옵니다. */
  async function save(at: string): Promise<"ok" | "stale" | "failed"> {
    const { sheets: list, tournamentId: id } = latest.current;
    try {
      const result = await drawAdminAction(id, { op: "printed", sheets: list, at });
      if (!("error" in result)) return "ok";
      if (result.error === STALE_PRINT) {
        router.refresh();
        return "stale";
      }
      setNotice({ tone: "error", text: `인쇄 기록을 남기지 못했습니다: ${result.error}` });
      return "failed";
    } catch {
      setNotice({ tone: "error", text: "인쇄 기록을 남기지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요." });
      return "failed";
    }
  }

  async function print() {
    setNotice(null);
    const at = new Date().toISOString();
    if (latest.current.record) {
      setBusy(true);
      const saved = await save(at);
      setBusy(false);
      if (saved === "stale") {
        setNotice({ tone: "error", text: STALE_PRINT });
        return;
      }
      if (saved === "failed") return;
    }
    // 종이의 출력 시각을 기록한 시각과 맞춘 뒤 인쇄 창을 엽니다.
    flushSync(() => setPrintStamp(at));
    fromButton.current = true;
    window.print();
  }

  useEffect(() => {
    const before = () => {
      if (fromButton.current) return;
      const at = new Date().toISOString();
      menuPrintAt.current = at;
      flushSync(() => setPrintStamp(at));
    };
    const after = async () => {
      if (fromButton.current) {
        fromButton.current = false;
        return;
      }
      const at = menuPrintAt.current;
      menuPrintAt.current = null;
      if (!at || !latest.current.record || latest.current.sheets.length === 0) return;
      const saved = await save(at);
      if (saved === "stale") {
        setNotice({
          tone: "error",
          text: "방금 인쇄한 기록지는 지금 대진표와 다릅니다. 그 종이는 버리고, 새로 불러온 내용을 다시 인쇄해 주세요.",
        });
      } else if (saved === "ok") {
        setNotice({ tone: "info", text: "인쇄한 기록지를 기록했습니다. 다음에는 위의 인쇄 단추를 써 주세요." });
      }
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
    // save 는 늘 latest 를 읽으므로 처음 한 번만 붙입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={busy || sheets.length === 0}
        onClick={() => void print()}
        className="btn btn-brand btn-sm"
      >
        <PrinterIcon className="size-4" />
        {busy ? "확인 중…" : "인쇄"}
      </button>
      {notice && (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={`max-w-md rounded-xl px-3 py-2 text-sm font-semibold break-keep ${
            notice.tone === "error" ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-800"
          }`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
