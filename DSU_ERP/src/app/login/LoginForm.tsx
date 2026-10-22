"use client";
import { useActionState } from "react";
import { signIn } from "./actions";
import type { Portal } from "@/shared/auth/portal";
export function LoginForm({ portal }: { portal: Portal }) {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action} className="erp-form">
      <input type="hidden" name="portal" value={portal} />
      <label htmlFor="email">University email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
        maxLength={254}
        placeholder="you@university.edu"
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={256}
      />
      <p className="erp-form-error" role="alert">
        {state.error}
      </p>
      <button className="erp-primary" disabled={pending}>
        {pending
          ? "Signing in…"
          : portal === "student"
            ? "Enter student workspace →"
            : "Enter placement workspace →"}
      </button>
      <p className="erp-muted">
        {portal === "student"
          ? "New here? Create a student account below. Use the email held in your university records for automatic profile matching."
          : "Placement officer access is assigned by your campus administrator."}
      </p>
    </form>
  );
}
