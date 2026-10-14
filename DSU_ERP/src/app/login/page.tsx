import Link from "next/link";
import { LoginForm } from "./LoginForm";
import "../portal/portal.css";
export default async function LoginPage({searchParams}:{searchParams:Promise<{portal?:string}>}) {
  const portal=(await searchParams).portal === "placement-officer" ? "placement-officer" : "campus";
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
        <p className="erp-eyebrow">{portal==="placement-officer"?"PLACEMENT OFFICER PORTAL":"ACCESS PORTAL"}</p>
        <h2>Welcome back.</h2>
        <p className="erp-muted">Sign in with your university account.</p>
        <LoginForm portal={portal}/>
        <Link className="erp-back" href={portal==="placement-officer"?"/login":"/login?portal=placement-officer"}>{portal==="placement-officer"?"Campus sign-in":"Placement Officer sign-in"} ↗</Link>
      </section>
    </main>
  );
}
