import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Blob Kinetics Analysis',
  description: 'Web tool for analyzing individual blob kinetics',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'dark')` }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
