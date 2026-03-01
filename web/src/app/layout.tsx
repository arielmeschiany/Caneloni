import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Canaloni – Discover Tuscany',
  description: 'Community-driven location discovery platform for Tuscany, Italy.',
  metadataBase: new URL('https://canaloni.app'),
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Canaloni – Discover Tuscany',
    description: 'Pin and discover restaurants, markets, streets, stores & boutiques across Tuscany.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
