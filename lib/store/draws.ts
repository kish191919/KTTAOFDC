import "server-only";
import { newDraw } from "@/lib/draw/admin";
import type { Draw } from "@/lib/types";
import { insertItem, readAll, readOne, removeItem, replaceItemIf } from "./db";

// 대진표 저장소. Supabase 의 draws 테이블에 대회 하나가 한 줄로 들어갑니다. (id = 대회 id)
// 대회 날에는 여러 사람이 동시에 점수를 넣으므로, 읽은 뒤 그 사이 바뀌지 않았을 때만 저장하고
// 바뀌었으면 새로 읽어 다시 적용합니다.

const TABLE = "draws";
const ATTEMPTS = 6;

export async function getDraw(id: string): Promise<Draw | null> {
  return readOne<Draw>(TABLE, id);
}

/** 모든 대진표. 관리 화면에서 어느 대회에 대진표가 있는지 보여 줄 때 씁니다. */
export async function listDraws(): Promise<Draw[]> {
  return readAll<Draw>(TABLE);
}

/** 대진표를 처음 만듭니다. 이미 있으면 있는 것을 돌려줍니다. */
export async function createDraw(id: string): Promise<Draw> {
  const draw = newDraw(id, new Date().toISOString());
  if (await insertItem(TABLE, draw)) return draw;
  return (await getDraw(id))!;
}

/**
 * 대진표를 고칩니다. change 는 지금 저장된 대진표를 받아 바꾼 대진표나 오류를 돌려줍니다.
 * 동시에 다른 사람이 먼저 저장했으면 새 내용으로 change 를 다시 부릅니다.
 * 대진표가 없으면 null, 끝내 저장하지 못하면 { busy: true } 입니다.
 */
export async function changeDraw<E extends object>(
  id: string,
  change: (draw: Draw) => { draw: Draw } | E,
): Promise<{ draw: Draw } | E | { busy: true } | null> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const current = await getDraw(id);
    if (!current) return null;
    const result = change(current);
    if (!("draw" in result)) return result;
    // 바뀐 것이 없으면 저장하지 않습니다.
    if (result.draw === current) return { draw: current };
    const saved: Draw = {
      ...result.draw,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    if (await replaceItemIf(TABLE, saved, "version", String(current.version))) {
      return { draw: saved };
    }
    await new Promise((resolve) => setTimeout(resolve, 40 + Math.random() * 120));
  }
  return { busy: true };
}

export async function deleteDraw(id: string): Promise<void> {
  await removeItem(TABLE, id);
}
