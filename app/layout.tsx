import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Odometer: Auto Finance Portfolio Analytics (Snowflake example)',
  description: 'Auto finance portfolio analytics on Snowflake: originations, delinquency, vintage losses, a collections work queue, dealer performance, and plain-English questions. Synthetic data.',
};

// Applies the saved or system color scheme before first paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem('afpa-theme');if(t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><Shell>{children}</Shell></body>
    </html>
  );
}
