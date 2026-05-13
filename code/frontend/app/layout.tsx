import type { Metadata } from 'next';
import { Raleway, DM_Sans } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Optima web fallback — renders natively on Mac/iOS, Raleway elsewhere
const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

// Avenir web fallback — renders natively on Mac/iOS, DM Sans elsewhere
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UPLB FaNS Knowledge Hub',
  description: 'A platform for curated research on food and nutrition security powered by UPLB.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${raleway.variable} ${dmSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
