import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description:
    "Conditions of use for the DSU placement workspace and its assistant.",
};

export default function Terms() {
  return (
    <main className="erp-legal">
      <p className="erp-eyebrow">DSU PLACEMENT WORKSPACE</p>
      <h1>Terms and conditions</h1>

      <p className="erp-callout">
        Draft awaiting institutional and legal review. It describes how the
        software behaves today. It is not a published agreement, and the
        governing law, jurisdiction and institutional entity details below are
        placeholders the university must supply.
      </p>

      <h2>Who may use this workspace</h2>
      <p>
        Access is limited to Training and Placement Cell staff whose accounts
        have been granted the placement officer role. Accounts are personal.
        Do not share credentials or leave an authenticated session unattended.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>
          Use student data only for placement administration and only as the
          university permits.
        </li>
        <li>
          Do not export, copy or forward student records beyond what your role
          requires. Exports are recorded in an audit log.
        </li>
        <li>Do not attempt to access records outside your authorisation.</li>
      </ul>

      <h2>The assistant</h2>
      <ul>
        <li>
          F.R.I.D.A.Y. answers using records already held by the university and
          general knowledge from a language model. It is a reference aid, not an
          authority.
        </li>
        <li>
          Model output can be wrong or incomplete. Verify any figure against the
          underlying report before acting on it, and before communicating it to
          a student or recruiter.
        </li>
        <li>
          Eligibility and academic categories are computed in the database from
          the exact stored CGPA. Where the assistant describes them it is
          reporting that calculation, not performing its own.
        </li>
        <li>
          The assistant cannot change records. Actions with external effects,
          such as sending an email, require a separate explicit confirmation
          showing exactly what will happen.
        </li>
        <li>
          Questions and retrieved campus figures are sent to the configured
          model provider for processing, as described in the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </li>
      </ul>

      <h2>Availability</h2>
      <p>
        The service is provided as is, without a guaranteed uptime commitment.
        Hosting and model provider limits may interrupt availability, and the
        assistant is unavailable when its provider is unreachable.
      </p>

      <h2>Governing law and contact</h2>
      <p className="erp-callout">
        Placeholder. The university must supply the contracting entity,
        governing law, jurisdiction and the contact address for notices.
      </p>

      <p>
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </main>
  );
}
