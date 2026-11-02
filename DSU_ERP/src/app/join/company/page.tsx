import Link from "next/link";
import { userSession } from "@/shared/auth/session";
import { signOut } from "@/app/login/actions";
import { AcceptInvite, SignInOrCreate } from "./JoinForms";
import "../../workspace.css";
import "../../company/company.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Join the company portal · DSU Placements", referrer: "no-referrer" };

export default async function JoinCompanyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = /^[A-Za-z0-9_-]{40,64}$/.test(token);
  let email: string | null = null;
  try {
    email = (await userSession()).user.email ?? null;
  } catch {
    email = null;
  }
  return (
    <main className="erp-access-state co-join">
      <p className="erp-eyebrow">DSU PLACEMENTS · COMPANY PORTAL</p>
      <h1>Join your company on the DSU placement portal.</h1>
      {!valid ? (
        <>
          <p>This invitation link is incomplete. Open the full link from the invitation email, or ask the placement office for a new one.</p>
          <div className="erp-actions">
            <Link className="erp-secondary" href="/">
              Back to campus
            </Link>
          </div>
        </>
      ) : email ? (
        <>
          <p>
            You are signed in as <strong>{email}</strong>. Accept the invitation to open your company&apos;s portal. This works only if the
            invitation was sent to this email address.
          </p>
          <AcceptInvite token={token} />
          <form action={signOut} style={{ marginTop: "1rem" }}>
            <button className="erp-secondary">Not you? Sign out</button>
          </form>
        </>
      ) : (
        <>
          <p>
            The placement office invited you to submit campus drives, follow their review and see the applicants they share with you. Invitations
            work once and expire after seven days.
          </p>
          <SignInOrCreate token={token} />
        </>
      )}
    </main>
  );
}
