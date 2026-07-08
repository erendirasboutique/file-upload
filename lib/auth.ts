// HMAC-signed session cookie using Web Crypto (Edge Runtime compatible).
// Same pattern as Erendira Shipping Studio's access-code auth.

const encoder = new TextEncoder();

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.AUTH_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionToken(): Promise<string> {
  // Session valid for 30 days
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `staff.${expires}`;
  const sig = await hmac(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expires, sig] = parts;
  if (Date.now() > Number(expires)) return false;
  const expected = await hmac(`${role}.${expires}`);
  return sig === expected;
}

export const SESSION_COOKIE = "efs_session";
