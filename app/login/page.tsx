"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signIn() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Sign-in failed.");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-20">
      <div className="bg-white rounded-[2rem] p-8 shadow-sm">
        <h1 className="font-display text-2xl text-taupe mb-1">Staff sign-in</h1>
        <p className="text-sm text-ink/60 mb-6">Enter the access code to upload files.</p>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()}
          placeholder="Access code"
          className="w-full rounded-full border border-sand bg-cream px-5 py-3 outline-none focus:border-taupe"
        />
        {error && <p className="text-sm text-red-700 mt-3">{error}</p>}
        <button
          onClick={signIn}
          disabled={busy || !code}
          className="mt-4 w-full rounded-full bg-taupe text-cream py-3 font-medium hover:bg-taupe/90 disabled:opacity-50 transition"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
