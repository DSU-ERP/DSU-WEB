import type { Metadata } from 'next';
import './globals.css';
import './static-campus.css';
export const metadata: Metadata = {
  title: 'DSU Agentic ERP — The Architecture of Intelligence',
  description: 'One campus. Infinite possibilities. Explore the vision of a connected university with DSU Agentic ERP.',
  robots: { index: false, follow: false },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body><a className="skip-link" href="#vision">Skip to main content</a>{children}</body></html>;
}
