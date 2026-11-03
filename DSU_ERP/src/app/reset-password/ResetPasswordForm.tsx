"use client";
import { useActionState } from "react";
import { updatePassword } from "./actions";
import { PasswordInput } from "@/components/forms/PasswordInput";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, { error: "" });
  return (
    <form action={action} className="erp-form">
      <label htmlFor="password">New password (at least 12 characters)</label>
      <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={12} maxLength={256} />
      <label htmlFor="confirm">Confirm new password</label>
      <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required minLength={12} maxLength={256} />
      <p className="erp-form-error" role="alert">
        {state.error}
      </p>
      <button className="erp-primary" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
