"use client";
import { useActionState } from "react";
import { signUp, resendConfirmation } from "./actions";
import { PasswordInput } from "@/components/forms/PasswordInput";
export function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, {
    error: "",
    success: "",
  });
  const [confirmation, resend, resending] = useActionState(resendConfirmation, {
    error: "",
    success: "",
  });
  return (
    <>
      <form className="st-form" action={action}>
        <label>
          Full name
          <input
            name="name"
            required
            minLength={2}
            maxLength={200}
            autoComplete="name"
          />
        </label>
        <label>
          University email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label>
          Password
          <PasswordInput
            name="password"
            required
            minLength={12}
            maxLength={256}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm password
          <PasswordInput
            name="confirm"
            required
            minLength={12}
            maxLength={256}
            autoComplete="new-password"
          />
        </label>
        {state.error && (
          <p className="st-error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="st-success" role="status">
            {state.success}
          </p>
        )}
        <button className="st-button" disabled={pending}>
          {pending ? "Creating account…" : "Create student account ↗"}
        </button>
      </form>
      <details className="st-confirmation-help">
        <summary>Need a new confirmation link?</summary>
        <form className="st-form" action={resend}>
          <label>
            Account email
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          {confirmation.error && (
            <p className="st-error" role="alert">
              {confirmation.error}
            </p>
          )}
          {confirmation.success && (
            <p className="st-success" role="status">
              {confirmation.success}
            </p>
          )}
          <button
            className="st-button st-button-secondary"
            disabled={resending}
          >
            {resending ? "Sending…" : "Send confirmation link"}
          </button>
        </form>
      </details>
    </>
  );
}
