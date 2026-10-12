import { SYSTEM_LAYERS, mergeCameraMatrix, type DrawingSource } from '@/config/illustrationChapters';
import { IllustrationView } from './IllustrationView';

/** The same five source views and final positions used by the hero and closing view. */
export function SystemMerge({ src }: { src: DrawingSource }) {
  return <aside className="system-merge" data-system-merge aria-label="Five architectural layers become one connected university, with the roof and dome settling last">
    <div className="merge-heading">
      <p className="eyebrow"><span className="eyebrow-square"/>[ CONNECTING THE LAYERS ]</p>
      <h2>Every layer.<br/>One complete university.</h2>
    </div>
    <svg className="merge-diagram" viewBox="0 0 1000 1000" aria-hidden="true">
      <g data-merge-camera transform={mergeCameraMatrix('connected')}>
        {/* Draw back to front. Every view uses the same source scale and x position. */}
        {[...SYSTEM_LAYERS].reverse().map(layer => <g key={layer.id} className="source-composite-layer" data-merge-layer={layer.id} transform={`translate(0 ${layer.assembledY})`}>
          <IllustrationView src={src} view={layer.id} fullSource/>
        </g>)}
      </g>
    </svg>
    <div className="merge-caption">
      <p data-merge-legend className="merge-legend">{[...SYSTEM_LAYERS].sort((a, b) => a.number.localeCompare(b.number)).map(layer => <span key={layer.id}><b>{layer.number}</b> {layer.label}</span>)}</p>
      <p data-merge-result className="merge-result"><span className="status-dot"/> ONE CONNECTED SYSTEM</p>
    </div>
  </aside>;
}
