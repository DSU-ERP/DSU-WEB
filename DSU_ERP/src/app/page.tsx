import { Navbar } from '@/components/layout/Navbar';
import { CampusPortal } from '@/components/animation/CampusPortal';
import { SmoothScroll } from '@/components/animation/SmoothScroll';
import { inspectAssets } from '@/lib/animation/assetValidation';
import { archivo } from './fonts';
import './landing.css';

export default async function Home() {
  const assets = await inspectAssets();
  const hasArtwork = assets.illustration === '/assets/college/grand-exploded-reference.png' && assets.width === 1672 && assets.height === 941;
  return <div className={`ln ${archivo.variable}`}>
    <SmoothScroll/>
    <Navbar/>
    <main id="vision" tabIndex={-1}>
      <CampusPortal hasArtwork={hasArtwork}/>
    </main>
  </div>;
}
