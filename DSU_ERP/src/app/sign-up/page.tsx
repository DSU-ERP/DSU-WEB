import Link from "next/link";
import { SignUpForm } from "./SignUpForm";
import { StudentBrand } from "@/features/student/components/StudentBrand";
import "../student/student.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ verification?: string }>;
}) {
  const failed = (await searchParams).verification === "failed";
  return (
    <main className="st-app st-auth">
      <Link className="st-brand" href="/" aria-label="Dayananda Sagar University — home">
        <StudentBrand />
      </Link>
      <section className="st-panel">
        <p className="st-eyebrow">
          <i />
          YOUR NEXT CHAPTER
        </p>
        <h1>Create your account.</h1>
        <p className="st-muted">
          Verify your email, then complete five steps: profile, education,
          interests, career goals and review. Details already held against your
          email will be filled in automatically.
        </p>
        {failed && (
          <p className="st-error" role="alert">
            This confirmation link has expired or could not be verified. Sign in
            if you already confirmed your email, or request a new confirmation
            below.
          </p>
        )}
        <SignUpForm />
        <p className="st-muted">
          Already have an account?{" "}
          <Link href="/login">Sign in ↗</Link>
        </p>
      </section>
    </main>
  );
}
