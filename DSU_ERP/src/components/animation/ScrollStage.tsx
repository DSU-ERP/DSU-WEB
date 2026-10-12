import type { AssetInventory } from '@/config/architecturalLayers';
import { ArchitectureAssembly } from './ArchitectureAssembly';
import { SceneTypography } from './SceneTypography';
import { ScrollIndicator } from './ScrollIndicator';
export function ScrollStage({ assets }: { assets: AssetInventory }) {
  return <div className="scroll-stage" data-scroll-stage>
    <div className="stage-masthead" aria-hidden="true"><span>THE ARCHITECTURE OF INTELLIGENCE</span><span>DSU / A CONNECTED INSTITUTION</span></div>
    <div className="stage-composition"><SceneTypography/><ArchitectureAssembly assets={assets}/></div>
    <ScrollIndicator/>
    <div className="stage-progress" aria-hidden="true"><span data-scroll-progress/></div>
  </div>;
}
