"use client";
import { useActionState } from "react";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, { error: "", success: "" });
  if (state.success)
    return (
      <p className="erp-muted" role="status" style={{ marginTop: "2rem" }}>
        {state.success}
      </p>
    );
  return (
    <form action={action} className="erp-form">
      <label htmlFor="email">Account email</label>
      <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@university.edu" />
      <p className="erp-form-error" role="alert">
        {state.error}
      </p>
      <button className="erp-primary" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="erp-muted">Open the link in this browser. It brings you back here to choose a new password.</p>
    </form>
  );
}
