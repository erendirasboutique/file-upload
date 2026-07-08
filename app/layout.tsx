import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erendira's Boutique — Files",
  description: "Shared files from Erendira's Boutique",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="px-6 py-5">
          <a href="/" className="font-display text-2xl tracking-wide text-taupe">
            Erendira&rsquo;s Boutique
          </a>
        </header>
        <main className="flex-1 px-4 pb-12">{children}</main>
        <footer className="px-6 py-6 text-center text-sm text-taupe/70">
          erendirasboutique.com
        </footer>
      </body>
    </html>
  );
}
