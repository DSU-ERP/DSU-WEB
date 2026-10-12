import type { DrawingSource } from '@/config/illustrationChapters';
import { DetailSection } from './DetailSection';
/** The final architectural detail, before all five parts reconnect. */
export function RoofSection({ src }: { src: DrawingSource }) {
  return <DetailSection id="roof-layer" number="05" label="The roof & central dome" title={<>The finishing layer.</>} description="The central dome, twin towers, and roof complete the university’s silhouette." view="roof" src={src}>
    <div><h3>EVERY PART BELONGS</h3><p>Distinct capabilities, brought together as one complete institution.</p></div>
    <p className="detail-functions">Roof <span>/</span> Towers <span>/</span> Central dome</p>
  </DetailSection>;
}
