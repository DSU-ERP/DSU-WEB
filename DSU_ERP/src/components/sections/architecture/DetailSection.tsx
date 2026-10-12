import type { DrawingSource } from '@/config/illustrationChapters';
import type { ReactNode } from 'react';
import { IllustrationView } from '@/components/animation/IllustrationView';
import type { DetailId } from '@/config/illustrationChapters';
export function DetailSection({ id, number, label, title, description, view, src, children }: {
  id: string; number: string; label: string; title: ReactNode; description: string;
  view: DetailId; src: DrawingSource; children: ReactNode;
}) {
  return <section id={id} className="journey-chapter detail-chapter" data-journey-chapter aria-labelledby={id + '-title'} tabIndex={-1}>
    <header className="chapter-heading" data-chapter-heading>
      <div><p className="eyebrow"><span className="eyebrow-square"/>[ EXPLODED VIEW / {number} ]</p><h2 id={id + '-title'}>{title}</h2></div>
      <p className="chapter-description">{description}</p>
    </header>
    <figure className="chapter-static-art"><IllustrationView src={src} view={view}/><figcaption>{label}</figcaption></figure>
    <div className="chapter-detail-content" data-chapter-details>
      <div className="detail-index"><span>{number}</span><p>{label}<small>ARCHITECTURAL DETAIL</small></p></div>
      <div className="detail-editorial">{children}</div>
    </div>
  </section>;
}
