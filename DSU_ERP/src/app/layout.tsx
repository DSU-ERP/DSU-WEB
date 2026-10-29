import type { Metadata } from 'next';
import './globals.css';
import './static-campus.css';
import { InspectGuard } from '@/components/security/InspectGuard';
export const metadata: Metadata = {
  title: 'DSU Agentic ERP',
  description: 'One campus. Infinite possibilities. Explore the vision of a connected university with DSU Agentic ERP.',
  robots: { index: false, follow: false },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><InspectGuard/><a className="skip-link" href="#vision">Skip to main content</a>{children}</body></html>;
}
