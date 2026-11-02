"use client";
import { useActionState } from "react";
import { acceptInvite, companySignIn, companySignUp, type JoinState } from "./actions";

const empty: JoinState = { error: "", success: "" };

export function AcceptInvite({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, empty);
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <button className="erp-primary" disabled={pending}>
        {pending ? "Joining…" : "Accept invitation"}
      </button>
      {state.error && <p className="erp-form-error" role="alert">{state.error}</p>}
    </form>
  );
}

export function SignInOrCreate({ token }: { token: string }) {
  const [signIn, signInAction, signingIn] = useActionState(companySignIn, empty);
  const [signUp, signUpAction, signingUp] = useActionState(companySignUp, empty);
  return (
    <div className="co-join-choice">
      <section aria-labelledby="co-join-new">
        <h2 id="co-join-new">New to the portal</h2>
        <p className="erp-muted">Create an account with the email address the invitation was sent to.</p>
        <form action={signUpAction}>
          <input type="hidden" name="token" value={token} />
          <label>
            Your name
            <input name="name" required minLength={2} maxLength={200} autoComplete="name" />
          </label>
          <label>
            Work email
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            Password (at least 12 characters)
            <input name="password" type="password" required minLength={12} maxLength={256} autoComplete="new-password" />
          </label>
          <label>
            Confirm password
            <input name="confirm" type="password" required minLength={12} maxLength={256} autoComplete="new-password" />
          </label>
          <button className="erp-primary" disabled={signingUp}>
            {signingUp ? "Creating account…" : "Create account"}
          </button>
          {signUp.error && <p className="erp-form-error" role="alert">{signUp.error}</p>}
          {signUp.success && <p className="cp-success" role="status">{signUp.success}</p>}
        </form>
      </section>
      <section aria-labelledby="co-join-existing">
        <h2 id="co-join-existing">Already have an account</h2>
        <p className="erp-muted">Sign in, then accept the invitation.</p>
        <form action={signInAction}>
          <input type="hidden" name="token" value={token} />
          <label>
            Email
            <input name="email" type="email" required maxLength={254} autoComplete="email" />
          </label>
          <label>
            Password
            <input name="password" type="password" required maxLength={256} autoComplete="current-password" />
          </label>
          <button className="erp-secondary" disabled={signingIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
          {signIn.error && <p className="erp-form-error" role="alert">{signIn.error}</p>}
        </form>
      </section>
    </div>
  );
}
