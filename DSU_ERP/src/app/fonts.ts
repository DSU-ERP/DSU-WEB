import { Archivo } from 'next/font/google';

/** Archivo, variable in weight and width, sets the landing page's carved
 * capitals. The width axis is what gives the wide plaque lettering. next/font
 * downloads it at build time and serves it from our own origin, so visitors
 * make no requests to Google. */
export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});
