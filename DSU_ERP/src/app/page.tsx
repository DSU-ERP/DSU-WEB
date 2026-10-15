import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { CampusPortal } from '@/components/animation/CampusPortal';
import { inspectAssets } from '@/lib/animation/assetValidation';
export default async function Home() {
  const assets = await inspectAssets();
  const hasArtwork = assets.illustration === '/assets/college/grand-exploded-reference.png' && assets.width === 1672 && assets.height === 941;
  return <><Navbar/><main id="vision" tabIndex={-1}>
    <CampusPortal src={hasArtwork ? assets.enhancedIllustration ?? assets.illustration! : null}/>
  </main>
  <footer className="landing-legal" aria-label="Policies">
    <Link href="/privacy">Privacy policy</Link>
    <Link href="/terms">Terms and conditions</Link>
  </footer></>;
}
