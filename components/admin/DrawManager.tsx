"use client";

import { useState } from "react";
import { drawAdminAction } from "@/lib/actions";
import type { DrawOp, EventSettings } from "@/lib/draw/admin";
import { entriesToText, entryName, parseEntries } from "@/lib/draw/entries";
import { winnerOf } from "@/lib/draw/play";
import { groupLetter, isByeMatch, type DrawPayload } from "@/lib/draw/view";
import type { Draw, DrawEvent } from "@/lib/types";
import { DrawBoard } from "@/components/draw/DrawBoard";
import { clockTime } from "@/components/draw/labels";
import { useLiveDraw } from "@/components/draw/useLiveDraw";
import { ExternalLinkIcon, PlusIcon, TrashIcon } from "@/components/icons";

type Props = {
  tournamentId: string;
  initial: DrawPayload;
  renderedAt: string;
  /** 방문자용 실시간 대진표 주소 */
  publicHref: string;
};

type Run = (op: DrawOp, notice?: string) => Promise<boolean>;

/** 관리자 화면의 대진표 관리: 대회장 설정, 종목별 참가자·조 편성, 경기 진행 */
export function DrawManager({ tournamentId, initial, renderedAt, publicHref }: Props) {
  const { payload, online, checkedAt, refresh, setDraw } = useLiveDraw(tournamentId, initial);
  const draw = payload.draw;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  const run: Run = async (op, notice) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await drawAdminAction(tournamentId, op);
      if ("error" in result) {
        setMessage({ error: true, text: result.error });
        return false;
      }
      setDraw(result.draw);
      if (notice) setMessage({ error: false, text: notice });
      return true;
    } catch {
      setMessage({ error: true, text: "저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const live = draw.events.some((event) => event.status === "live");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm ${online ? "text-slate-500" : "font-bold text-accent-600"}`}>
          <span suppressHydrationWarning>
            {online
              ? `${clockTime(checkedAt ?? renderedAt, "ko", true)} 기준 · 5초마다 새로 고칩니다`
              : "연결이 끊겼습니다. 다시 연결하는 중입니다…"}
          </span>
        </p>
        <a href={publicHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
          방문자 화면 열기
          <ExternalLinkIcon className="size-4" />
        </a>
      </div>

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`sticky top-20 z-10 rounded-xl px-4 py-3 text-sm font-semibold whitespace-pre-line shadow-sm ${
            message.error
              ? "bg-accent-50 text-accent-700 ring-1 ring-accent-200"
              : "bg-brand-50 text-brand-800 ring-1 ring-brand-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <VenueSettings draw={draw} scoring={payload.scoring} busy={busy} run={run} />

      {draw.events.map((event) => (
        <EventCard key={event.id} event={event} busy={busy} run={run} />
      ))}

      <AddEvent busy={busy} run={run} count={draw.events.length} />

      {live && (
        <section className="space-y-4 border-t border-brand-100 pt-8">
          <div>
            <h2 className="text-2xl font-black text-brand-950">경기 진행</h2>
            <p className="mt-1 text-sm break-keep text-slate-500">
              방문자 화면과 같습니다. 경기를 누르면 점수를 고치거나, 테이블을 옮기거나, 결과를 지울 수 있습니다.
            </p>
          </div>
          <DrawBoard
            tournamentId={tournamentId}
            lang="ko"
            draw={draw}
            scoring={payload.scoring}
            admin
            onDraw={setDraw}
            onRefresh={refresh}
          />
        </section>
      )}
    </div>
  );
}

// ───────────────────────── 대회장 설정 ─────────────────────────

function VenueSettings({
  draw,
  scoring,
  busy,
  run,
}: {
  draw: Draw;
  scoring: boolean;
  busy: boolean;
  run: Run;
}) {
  const [tables, setTables] = useState(String(draw.tables));
  const [open, setOpen] = useState(draw.scoringOpen);
  return (
    <section className="card p-6">
      <h2 className="text-lg font-black text-brand-950">대회장 설정</h2>
      <form
        className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run({ op: "settings", tables: Number(tables), scoringOpen: open }, "대회장 설정을 저장했습니다.");
        }}
      >
        <label className="block w-32">
          <span className="label">테이블 수</span>
          <input
            type="number"
            min={0}
            max={40}
            value={tables}
            onChange={(e) => setTables(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex max-w-md cursor-pointer items-start gap-3 pb-2">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => setOpen(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-brand-700"
          />
          <span>
            <span className="block font-semibold text-slate-800">누구나 점수 입력</span>
            <span className="hint block break-keep">
              체크를 풀면 관리자만 입력할 수 있습니다. 체크해 두어도 대회 다음 날이 지나면 저절로 막힙니다.
            </span>
          </span>
        </label>
        <button type="submit" disabled={busy} className="btn btn-brand btn-sm mb-1.5">
          저장
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-500">
        테이블을 0으로 두면 자동 배정 없이 경기 순서만 보여 줍니다. 지금 방문자 점수 입력:{" "}
        <strong className={scoring ? "text-brand-700" : "text-accent-700"}>{scoring ? "열림" : "닫힘"}</strong>
      </p>
    </section>
  );
}

// ───────────────────────── 종목 설정 ─────────────────────────

const DEFAULT_SETTINGS: EventSettings = {
  name: "",
  doubles: true,
  bestOf: 5,
  groupSize: 4,
  advance: 2,
};

function SettingsForm({
  initial,
  submitLabel,
  busy,
  locked,
  onSubmit,
}: {
  initial: EventSettings;
  submitLabel: string;
  busy: boolean;
  /** 경기를 시작한 종목은 이름만 고칩니다. */
  locked?: boolean;
  onSubmit: (settings: EventSettings) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initial);
  const set = <K extends keyof EventSettings>(key: K, v: EventSettings[K]) =>
    setValue((current) => ({ ...current, [key]: v }));

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(value);
      }}
    >
      <label className="block">
        <span className="label">종목 이름</span>
        <input
          className="field"
          value={value.name}
          maxLength={40}
          placeholder="예: 복식 U1000"
          onChange={(e) => set("name", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label">영어 화면용 이름 (선택)</span>
        <input
          className="field"
          value={value.nameEn ?? ""}
          maxLength={40}
          placeholder="예: Doubles U-1000"
          onChange={(e) => set("nameEn", e.target.value)}
        />
      </label>
      <label className="block">
        <span className="label">종류</span>
        <select
          className="field"
          disabled={locked}
          value={value.doubles ? "doubles" : "singles"}
          onChange={(e) => set("doubles", e.target.value === "doubles")}
        >
          <option value="doubles">복식 (두 사람이 한 팀)</option>
          <option value="singles">단식</option>
        </select>
      </label>
      <label className="block">
        <span className="label">경기 방식</span>
        <select
          className="field"
          disabled={locked}
          value={value.bestOf}
          onChange={(e) => set("bestOf", Number(e.target.value))}
        >
          <option value={3}>3게임 2선승</option>
          <option value={5}>5게임 3선승</option>
          <option value={7}>7게임 4선승</option>
        </select>
      </label>
      <label className="block">
        <span className="label">예선 한 조 인원</span>
        <select
          className="field"
          disabled={locked}
          value={value.groupSize}
          onChange={(e) => set("groupSize", Number(e.target.value))}
        >
          {[3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}명(팀) {n === 4 ? "— 모자라면 3명 조가 생깁니다" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">조마다 본선 진출</span>
        <select
          className="field"
          disabled={locked}
          value={value.advance}
          onChange={(e) => set("advance", Number(e.target.value))}
        >
          <option value={2}>1·2위</option>
          <option value={1}>1위만</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn btn-brand btn-sm">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function AddEvent({ busy, run, count }: { busy: boolean; run: Run; count: number }) {
  const [open, setOpen] = useState(count === 0);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline">
        <PlusIcon className="size-5" />
        종목 추가
      </button>
    );
  }
  return (
    <section className="card p-6">
      <h2 className="text-lg font-black text-brand-950">새 종목</h2>
      <p className="mt-1 text-sm break-keep text-slate-500">
        종목마다 참가자를 받아 예선 조별 리그를 치르고, 조가 둘 이상이면 본선 토너먼트로 이어집니다.
      </p>
      <div className="mt-5">
        <SettingsForm
          key={count}
          initial={DEFAULT_SETTINGS}
          submitLabel="종목 만들기"
          busy={busy}
          onSubmit={async (settings) => {
            const ok = await run({ op: "addEvent", ...settings }, `'${settings.name}' 종목을 만들었습니다.`);
            if (ok) setOpen(false);
            return ok;
          }}
        />
      </div>
    </section>
  );
}

// ───────────────────────── 종목 카드 ─────────────────────────

function EventCard({ event, busy, run }: { event: DrawEvent; busy: boolean; run: Run }) {
  const live = event.status === "live";
  const unit = event.doubles ? "팀" : "명";
  const real = event.matches.filter((m) => !isByeMatch(m));
  const done = real.filter((m) => winnerOf(m, event.bestOf)).length;
  const settings: EventSettings = {
    name: event.name,
    ...(event.nameEn ? { nameEn: event.nameEn } : {}),
    doubles: event.doubles,
    bestOf: event.bestOf,
    groupSize: event.groupSize,
    advance: event.advance,
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-brand-50/60 px-6 py-4">
        <div>
          <h2 className="text-xl font-black text-brand-950">{event.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {event.doubles ? "복식" : "단식"} · {event.bestOf}게임 {Math.floor(event.bestOf / 2) + 1}선승 · 참가{" "}
            {event.entries.length}
            {unit}
            {event.groups.length > 0 && ` · ${event.groups.length}개 조`}
            {live && ` · 경기 ${done}/${real.length} 끝남`}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            live ? "bg-accent-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
          }`}
        >
          {live ? "경기 중" : "준비 중"}
        </span>
      </div>

      <div className="space-y-6 p-6">
        <details className="group">
          <summary className="cursor-pointer text-sm font-bold text-brand-700">종목 설정 바꾸기</summary>
          <div className="mt-4 space-y-4">
            <SettingsForm
              key={JSON.stringify(settings)}
              initial={settings}
              submitLabel="설정 저장"
              busy={busy}
              locked={live}
              onSubmit={(next) => run({ op: "updateEvent", event: event.id, ...next }, "종목 설정을 저장했습니다.")}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`'${event.name}' 종목을 지울까요? 참가자와 경기 결과가 모두 지워집니다.`)) {
                  void run({ op: "removeEvent", event: event.id }, "종목을 지웠습니다.");
                }
              }}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 hover:underline"
            >
              <TrashIcon className="size-4" />
              종목 지우기
            </button>
          </div>
        </details>

        {live ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <p className="min-w-0 flex-1 text-sm break-keep text-slate-600">
              경기가 진행 중입니다. 참가자나 조 편성을 바꾸려면 조 편성 단계로 되돌려야 하고, 그러면 입력한 점수가 모두 지워집니다.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `'${event.name}' 의 경기 결과 ${done}개를 모두 지우고 조 편성 단계로 되돌릴까요? 되돌린 뒤에는 결과를 되살릴 수 없습니다.`,
                  )
                ) {
                  void run({ op: "reset", event: event.id }, "조 편성 단계로 되돌렸습니다.");
                }
              }}
              className="btn btn-ghost btn-sm text-accent-700"
            >
              조 편성으로 되돌리기
            </button>
          </div>
        ) : (
          <>
            <EntriesEditor key={entriesToText(event.entries)} event={event} busy={busy} run={run} />
            <GroupsEditor event={event} busy={busy} run={run} />
          </>
        )}
      </div>
    </section>
  );
}

function EntriesEditor({ event, busy, run }: { event: DrawEvent; busy: boolean; run: Run }) {
  const saved = entriesToText(event.entries);
  const [text, setText] = useState(saved);
  const preview = parseEntries(text, event.doubles);
  const unit = event.doubles ? "팀" : "명";
  const changed = text.trim() !== saved.trim();

  return (
    <div>
      <h3 className="font-black text-brand-950">1. 참가자</h3>
      <p className="mt-1 text-sm break-keep text-slate-500">
        한 줄에 {event.doubles ? "한 팀" : "한 명"}씩 적거나 엑셀·구글 시트에서 복사해 붙여 넣으세요. 칸은 쉼표나 탭으로 나눕니다.
        <br />
        {event.doubles
          ? "예) 홍길동 / 김철수, 1100, KCPC   — 이름 두 개, 레이팅(두 사람 합 또는 각자), 소속(선택)"
          : "예) 홍길동, 1500, KCPC   — 이름, 레이팅, 소속(선택)"}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(16, Math.max(5, text.split("\n").length + 1))}
        className="field mt-3 font-mono text-sm"
        placeholder={event.doubles ? "홍길동 / 김철수, 1100, KCPC" : "홍길동, 1500, KCPC"}
        spellCheck={false}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !changed || preview.errors.length > 0}
          onClick={() =>
            void run(
              { op: "entries", event: event.id, text },
              `참가자 ${preview.entries.length}${unit}을 저장했습니다. 조 편성을 새로 만들어 주세요.`,
            )
          }
          className="btn btn-brand btn-sm"
        >
          참가자 저장
        </button>
        <span className="text-sm text-slate-500">
          {preview.entries.length}
          {unit}
          {changed && " · 저장하지 않은 변경이 있습니다"}
        </span>
      </div>
      {preview.errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
          {preview.errors.slice(0, 8).map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {preview.entries.length > 0 && changed && preview.errors.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">
          읽은 내용: {preview.entries.slice(0, 3).map((e) => `${entryName(e)}${e.rating ? ` (${e.rating})` : ""}`).join(", ")}
          {preview.entries.length > 3 && " …"}
        </p>
      )}
    </div>
  );
}

function GroupsEditor({ event, busy, run }: { event: DrawEvent; busy: boolean; run: Run }) {
  const entries = new Map(event.entries.map((e) => [e.id, e]));
  const hasGroups = event.groups.length > 0;
  const knockout = event.groups.length > 1;

  return (
    <div>
      <h3 className="font-black text-brand-950">2. 조 편성</h3>
      <p className="mt-1 text-sm break-keep text-slate-500">
        레이팅이 높은 순서로 A조부터 지그재그로 나누고, 같은 소속은 되도록 다른 조에 넣습니다. 편성한 뒤 참가자를 다른 조로 옮길 수 있습니다.
      </p>
      <button
        type="button"
        disabled={busy || event.entries.length < 2}
        onClick={() => {
          if (!hasGroups || window.confirm("지금 조 편성을 지우고 다시 만들까요?")) {
            void run({ op: "autoGroups", event: event.id }, "조 편성을 만들었습니다.");
          }
        }}
        className="btn btn-ghost btn-sm mt-3"
      >
        {hasGroups ? "조 편성 다시 만들기" : "조 편성 만들기"}
      </button>

      {hasGroups && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {event.groups.map((members, group) => (
              <div key={group} className="rounded-xl border border-slate-200">
                <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-brand-900">
                  {groupLetter(group)}조 · {members.length}
                  {event.doubles ? "팀" : "명"}
                </p>
                <ul className="divide-y divide-slate-100">
                  {members.map((id) => {
                    const entry = entries.get(id);
                    if (!entry) return null;
                    return (
                      <li key={id} className="flex items-center gap-2 px-4 py-2">
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-semibold break-keep text-slate-800">{entryName(entry)}</span>
                          <span className="block text-xs text-slate-400">
                            {[entry.rating ?? "레이팅 없음", entry.club].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <select
                          aria-label={`${entryName(entry)} 다른 조로 옮기기`}
                          value=""
                          disabled={busy}
                          onChange={(e) =>
                            void run({ op: "moveEntry", event: event.id, entry: id, group: Number(e.target.value) })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                        >
                          <option value="">옮기기</option>
                          {event.groups.map((_, g) =>
                            g === group ? null : (
                              <option key={g} value={g}>
                                {groupLetter(g)}조로
                              </option>
                            ),
                          )}
                          <option value={event.groups.length}>새 조로</option>
                        </select>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl bg-brand-50/60 px-4 py-4">
            <h3 className="font-black text-brand-950">3. 경기 시작</h3>
            <p className="mt-1 text-sm break-keep text-slate-600">
              {knockout
                ? `조별 리그가 끝나면 조 ${event.advance === 2 ? "1·2위" : "1위"}가 본선 토너먼트에 오릅니다. `
                : "조가 하나라서 리그 순위로 우승을 정합니다. "}
              시작하면 경기 순서가 정해지고 빈 테이블에 첫 경기들이 배정됩니다.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`'${event.name}' 경기를 시작할까요? 시작한 뒤에는 참가자와 조 편성을 바꿀 수 없습니다.`)) {
                  void run({ op: "start", event: event.id }, `'${event.name}' 경기를 시작했습니다.`);
                }
              }}
              className="btn btn-accent btn-sm mt-3"
            >
              경기 시작
            </button>
          </div>
        </>
      )}
    </div>
  );
}
