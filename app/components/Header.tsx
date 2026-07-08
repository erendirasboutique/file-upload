"use client";

import { useState } from "react";

export default function Header() {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <header className="px-6 py-5">
      <a href="/" className="inline-flex items-center gap-3 group">
        {logoOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.png"
            alt="Erendira's Boutique"
            className="h-10 w-auto transition-transform duration-300 group-hover:scale-105"
            onError={() => setLogoOk(false)}
          />
        )}
        <span className="font-display text-2xl tracking-wide text-taupe transition-colors group-hover:text-ink">
          Erendira&rsquo;s Boutique
        </span>
      </a>
    </header>
  );
}
