import Link from "next/link";
import Image from "next/image";

/** The sign-in layout (campus panel plus form panel), shared by the password reset pages. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main id="vision" className="erp-login">
      <section className="erp-login-intro">
        <Link href="/" className="erp-login-logo" aria-label="Dayananda Sagar University home">
          <Image src="/assets/college/dsu-official-logo-dark.png" alt="Dayananda Sagar University" width={2579} height={828} priority />
        </Link>
        <div>
          <p className="erp-eyebrow">YOUR CONNECTED CAMPUS</p>
          <h1>
            One place.
            <br />
            Every possibility.
          </h1>
          <p>
            Your academic life, connected.
            <br />
            Secure access for the university community.
          </p>
        </div>
        <span className="erp-small">DAYANANDA SAGAR UNIVERSITY</span>
      </section>
      <section className="erp-login-form">{children}</section>
    </main>
  );
}
