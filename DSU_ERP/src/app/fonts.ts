import { Geist } from 'next/font/google';

/** Geist Light for large display text. The app's own Geist files only cover
 * weights 400-600; next/font downloads this weight at build time and serves it
 * from our own origin, so visitors make no requests to Google. */
export const geistLight = Geist({
  subsets: ['latin'],
  weight: '300',
  display: 'swap',
  variable: '--font-geist-light',
});
