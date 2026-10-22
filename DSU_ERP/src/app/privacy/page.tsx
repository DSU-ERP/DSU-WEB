import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How the DSU placement workspace handles account, student, conversation and microphone data.",
};

export default function PrivacyPolicy() {
  return (
    <main className="erp-legal">
      <p className="erp-eyebrow">DSU PLACEMENT WORKSPACE</p>
      <h1>Privacy policy</h1>

      <p className="erp-callout">
        Draft awaiting institutional review. This page describes what the
        software currently does, verified against the implementation. It has not
        been approved by Dayananda Sagar University, and the controller details,
        retention periods and grievance contact below are placeholders that the
        university must supply before publication.
      </p>

      <h2>Who this covers</h2>
      <p>
        This workspace is used by authorised Training and Placement Cell staff.
        Students do not sign in to it. Student records shown here originate from
        official university exports already held by the institution.
      </p>

      <h2>What the workspace stores</h2>
      <ul>
        <li>
          <strong>Account identity.</strong> Your sign-in is handled by Supabase
          authentication. The workspace records your user identifier to decide
          what you may read and to attribute actions.
        </li>
        <li>
          <strong>Student records.</strong> Academic, admission, contact, drive,
          offer and assessment records imported from official university
          sources. The workspace reads these; it is not their original source.
        </li>
        <li>
          <strong>Assistant conversations.</strong> Questions you type or dictate
          to F.R.I.D.A.Y., and the replies produced, are stored against your
          account so you can reopen them. Only you can read your own
          conversations. You can delete any conversation from the assistant
          page, which removes it and its messages.
        </li>
        <li>
          <strong>Audit events.</strong> Exports and actions with external
          effects are recorded with the acting account, the action and the
          affected record identifier.
        </li>
      </ul>

      <h2>Microphone and speech</h2>
      <ul>
        <li>
          The microphone is used after you start voice practice, enable spoken
          questions with listening, or press a microphone button. It stops when
          you end recording or leave the page. Proctored interviews request
          permissions before the session begins.
        </li>
        <li>
          AI Interview transcribes English speech locally in your browser using
          a bundled Whisper model. Interview audio is not sent to a transcription
          service or uploaded to the application. Its spoken questions use
          installed offline device voices. Other workspace microphone features
          use the browser&rsquo;s built-in recognition service, which may send
          audio to the browser vendor under its privacy policy.
        </li>
        <li>
          Audio recordings are not uploaded to this application and are not
          stored by it. Only the resulting text transcript, which you can edit
          before sending, becomes part of a conversation.
        </li>
        <li>
          Spoken replies are produced by your browser&rsquo;s built-in speech
          synthesis. No audio is sent to this application for playback.
        </li>
        <li>
          Microphone access stops when you end recording or leave the page.
        </li>
      </ul>

      <h2>Third parties that receive data</h2>
      <ul>
        <li>
          <strong>Supabase</strong> hosts the database and authentication for
          this workspace.
        </li>
        <li>
          <strong>OpenRouter</strong> routes assistant requests to the configured
          language model provider. Your question, the recent messages in that
          conversation, and the campus figures retrieved to answer it are sent
          for processing. Database credentials are never sent.
        </li>
        <li>
          <strong>Your browser vendor</strong> may process microphone audio for
          speech recognition, as described above.
        </li>
      </ul>
      <p>
        Student contact and family details are deliberately withheld from the
        assistant&rsquo;s model requests. They remain visible to you on the
        student profile page.
      </p>

      <h2>Retention</h2>
      <p className="erp-callout">
        Placeholder. The university must confirm how long assistant
        conversations, audit events and imported student records are retained.
        Conversations persist until you delete them or the institution applies a
        retention rule.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Delete any assistant conversation from the assistant page.</li>
        <li>Use the workspace entirely by keyboard without granting microphone access.</li>
        <li>Turn spoken replies off; it is off by default.</li>
      </ul>

      <h2>Contact</h2>
      <p className="erp-callout">
        Placeholder. The university must supply the data controller name,
        postal address, privacy contact address and grievance officer required
        for publication.
      </p>

      <p>
        <Link href="/terms">Terms and conditions</Link>
      </p>
    </main>
  );
}
