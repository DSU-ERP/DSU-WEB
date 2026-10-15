"use client";
import { useActionState } from "react";
import { signIn } from "./actions";
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
        {pending ? "Signing in…" : "Enter Placement Officer workspace →"}
      </button>
      <p className="erp-muted">
        Access is provided by your campus administrator. Contact them if you
        need an account or a password reset.
      </p>
    </form>
  );
}
