import Link from "next/link";
import { LoginForm } from "./LoginForm";
import "../workspace.css";
export default function LoginPage() {
  return (
    <main id="vision" className="erp-login">
      <section className="erp-login-intro">
        <Link href="/" className="erp-wordmark">
          DSU <span>/ AGENTIC ERP</span>
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
      <section className="erp-login-form">
        <Link href="/" className="erp-back">
          ← Back to campus
        </Link>
        <p className="erp-eyebrow">PLACEMENT OFFICER PORTAL</p>
        <h2>Welcome back.</h2>
        <p className="erp-muted">Sign in with your university account.</p>
        <LoginForm />
      </section>
    </main>
  );
}
