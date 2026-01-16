import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// ✅ FIX: "NavBar" must match the filename "NavBar.tsx" exactly (Capital B)
import Navbar from '@/components/layout/NavBar'; 
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jackpot Intel',
  description: 'The world\'s first variance-protected prediction protocol.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* Added suppressHydrationWarning to ignore Grammarly/Extension injections */}
      <body 
        className={`${inter.className} flex flex-col min-h-screen bg-black text-white`}
        suppressHydrationWarning={true}
      >
        <Navbar />
        
        {/* Main content grows to fill space, pushing footer down */}
        {/* pt-16 compensates for the fixed Navbar height */}
        <main className="flex-grow pt-16">
          {children}
        </main>
        
        <Footer />
      </body>
    </html>
  );
}