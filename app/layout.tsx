import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Erendira's Boutique — Files",
  description: "Shared files from Erendira's Boutique",
  openGraph: {
    title: "Erendira's Boutique",
    description: "Shared files from Erendira's Boutique",
    url: siteUrl,
    siteName: "Erendira's Boutique",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 px-4 pb-12">{children}</main>
        <footer className="px-6 py-6 text-center text-sm text-taupe/70">
          erendirasboutique.com
        </footer>
      </body>
    </html>
  );
}
