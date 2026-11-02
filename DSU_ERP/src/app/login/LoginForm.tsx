"use client";
import { useActionState } from "react";
import { signIn } from "./actions";
// One form for every role: after sign-in, /workspace opens the student or
// placement officer workspace that the account is authorised for.
export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action} className="erp-form">
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
        {pending ? "Signing in…" : "Sign in →"}
      </button>
      <p className="erp-muted">
        Students and placement officers sign in here. You&apos;ll go straight
        to the workspace your account has access to.
      </p>
    </form>
  );
}
