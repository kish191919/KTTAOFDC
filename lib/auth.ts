import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

// 관리자 로그인. 비밀번호는 .env.local 의 ADMIN_PASSWORD 에 둡니다.
// 로그인하면 서명된 쿠키를 발급하고, 관리자 페이지·저장 요청마다 그 서명을 확인합니다.

const COOKIE = "ktta_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function secret(): string {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  // 길이가 달라도 비교 시간이 같도록 해시한 뒤 비교합니다.
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(input, expected);
}

export async function createSession(): Promise<void> {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expires}`;
  const isHttps = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  // 쿠키를 먼저 읽어야 이 함수를 쓰는 페이지가 빌드 때 고정되지 않습니다.
  const value = (await cookies()).get(COOKIE)?.value;
  if (!isAdminConfigured() || !value) return false;
  const cut = value.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = value.slice(0, cut);
  const signature = value.slice(cut + 1);
  if (!safeEqual(signature, sign(payload))) return false;
  const expires = Number(payload.split(".")[1]);
  return Number.isFinite(expires) && expires > Date.now();
}

/** 관리자 페이지 맨 위에서 호출합니다. 로그인하지 않았으면 로그인 화면으로 보냅니다. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
