import "server-only";
import { database } from "./supabase";

// 글 내용을 담는 Supabase 테이블을 읽고 쓰는 공통 함수입니다.
// 항목 하나가 한 줄이고, data 칸에 lib/types.ts 의 모양 그대로 들어갑니다. (supabase/schema.sql)

export type Table = "tournaments" | "albums" | "news_posts" | "hero_media";

type Item = { id: string };

/** 이미 있는 id 로 넣으려 할 때 데이터베이스가 돌려주는 오류 코드 */
const DUPLICATE = "23505";

export function fail(table: Table, error: { message: string }): never {
  throw new Error(`${table} 테이블을 처리하지 못했습니다: ${error.message}`);
}

/** 테이블의 모든 항목. orderBy 를 주면 그 칸이 작은 것부터 돌려줍니다. */
export async function readAll<T>(table: Table, orderBy?: string): Promise<T[]> {
  const query = database().from(table).select("data");
  const { data, error } = await (orderBy ? query.order(orderBy) : query);
  if (error) fail(table, error);
  return data.map((row) => row.data as T);
}

export async function readOne<T>(table: Table, id: string): Promise<T | null> {
  const { data, error } = await database().from(table).select("data").eq("id", id).maybeSingle();
  if (error) fail(table, error);
  return data ? (data.data as T) : null;
}

/**
 * 새 항목을 넣습니다. 같은 id 가 이미 있으면 넣지 않고 false 를 돌려줍니다.
 * data 말고 따로 채울 칸(예: position)은 columns 로 줍니다.
 */
export async function insertItem<T extends Item>(
  table: Table,
  item: T,
  columns?: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await database()
    .from(table)
    .insert({ ...columns, id: item.id, data: item });
  if (!error) return true;
  if (error.code === DUPLICATE) return false;
  fail(table, error);
}

/** 그 id 의 내용을 통째로 바꿉니다. 없는 id 면 false */
export async function replaceItem<T extends Item>(table: Table, item: T): Promise<boolean> {
  const { data, error } = await database()
    .from(table)
    .update({ data: item })
    .eq("id", item.id)
    .select("id");
  if (error) fail(table, error);
  return data.length > 0;
}

/** 항목을 지우고 지운 내용을 돌려줍니다. 없는 id 면 null */
export async function removeItem<T>(table: Table, id: string): Promise<T | null> {
  const { data, error } = await database().from(table).delete().eq("id", id).select("data");
  if (error) fail(table, error);
  return data.length > 0 ? (data[0].data as T) : null;
}
