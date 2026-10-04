"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="password" className="label">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          placeholder="••••••••"
          className="field"
        />
      </div>
      {state.error && (
        <p className="text-sm font-medium text-accent-700" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-brand w-full rounded-xl">
        {pending ? "확인하는 중…" : "로그인"}
      </button>
    </form>
  );
}
