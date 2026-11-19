import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Navbar() {
  return <header className="ln-header">
    <a className="ln-brand" href="#vision" aria-label="Dayananda Sagar University, DSU Agentic ERP: back to the top">
      {/* Official lockup, light variant for the charcoal ground. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ln-brand-logo" src="/assets/college/dsu-official-logo.png" alt="" width="2579" height="828"/>
      <span className="ln-brand-product" aria-hidden="true">Agentic ERP</span>
    </a>
    <nav className="ln-header-nav" aria-label="Account">
      <Link href="/login" className="ln-header-link">Sign in <ArrowRight aria-hidden="true" size={15} strokeWidth={1.75}/></Link>
    </nav>
  </header>;
}
