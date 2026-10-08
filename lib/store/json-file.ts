import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

// 데이터베이스를 연결하기 전까지 쓰는 파일 저장소입니다.
// data/*.json 파일 하나가 테이블 하나 역할을 합니다.

/**
 * Vercel 같은 서버리스 환경은 디스크에 쓴 내용이 유지되지 않으므로
 * 데이터베이스를 연결하기 전까지는 '읽기 전용'으로 동작합니다.
 */
export const STORE_WRITABLE = !process.env.VERCEL;

export function dataFile(name: string): string {
  return path.join(process.cwd(), "data", name);
}

export async function readCollection<T>(file: string): Promise<T[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

// 여러 저장 요청이 겹쳐도 파일이 깨지지 않도록 한 번에 하나씩만 씁니다.
let queue: Promise<unknown> = Promise.resolve();

/**
 * 파일을 읽고 → 고치고 → 다시 쓰는 과정을 한 묶음으로 실행합니다.
 * `mutate` 는 새 목록(items)과 호출한 쪽에 돌려줄 값(result)을 반환합니다.
 */
export function mutateCollection<T, R>(
  file: string,
  mutate: (items: T[]) => { items: T[]; result: R },
): Promise<R> {
  const run = queue.then(async () => {
    if (!STORE_WRITABLE) {
      throw new Error("이 환경에서는 데이터를 저장할 수 없습니다.");
    }
    const { items, result } = mutate(await readCollection<T>(file));
    await fs.mkdir(path.dirname(file), { recursive: true });
    // 임시 파일에 쓴 뒤 이름을 바꿔서, 쓰는 도중 문제가 생겨도 원본이 남게 합니다.
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    await fs.rename(tmp, file);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}
