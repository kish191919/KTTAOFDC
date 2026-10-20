"use client";

import type { DrawPayload } from "@/lib/draw/view";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DrawBoard } from "./DrawBoard";
import { clockTime } from "./labels";
import { useLiveDraw } from "./useLiveDraw";

type Props = {
  tournamentId: string;
  lang: Locale;
  initial: DrawPayload;
  /** 서버가 이 화면을 만든 때 (처음 화면의 '○시 ○분 기준' 표시) */
  renderedAt: string;
};

/** 방문자용 실시간 대진표. 5초마다 새 결과를 받아 와 다시 그립니다. */
export function LiveDraw({ tournamentId, lang, initial, renderedAt }: Props) {
  const t = getDictionary(lang).draw;
  const { payload, online, checkedAt, refresh, setDraw } = useLiveDraw(tournamentId, initial);
  return (
    <div className="space-y-4">
      <p aria-live="polite" className={`text-xs ${online ? "text-slate-400" : "font-bold text-accent-600"}`}>
        <span suppressHydrationWarning>
          {online ? t.updated(clockTime(checkedAt ?? renderedAt, lang, true)) : t.reconnecting}
        </span>
      </p>
      <DrawBoard
        tournamentId={tournamentId}
        lang={lang}
        draw={payload.draw}
        scoring={payload.scoring}
        onDraw={setDraw}
        onRefresh={refresh}
      />
    </div>
  );
}
