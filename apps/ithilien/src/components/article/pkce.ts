/**
 * PKCE (RFC 7636) helpers. Kept apart from the component so the maths can be
 * checked against the RFC's own example.
 */

/** RFC 7636 §4.1: unreserved characters allowed in a code verifier. */
const VERIFIER_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/** A random 43-character verifier, the shortest RFC 7636 allows. */
export function createCodeVerifier(length = 43): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  // Only the first 64 characters are used: 256 divides evenly by 64, so
  // `b % 64` picks each one equally often.
  return Array.from(bytes, (b) => VERIFIER_ALPHABET[b % 64]).join("");
}

/** base64url without padding, as RFC 7636 Appendix A specifies. */
export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** S256 challenge: BASE64URL(SHA256(ASCII(code_verifier))). */
export async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64Url(new Uint8Array(digest));
}

/** RFC 7636 §4.1: 43 to 128 unreserved characters. */
export function isValidVerifier(verifier: string): boolean {
  return /^[A-Za-z0-9\-._~]{43,128}$/.test(verifier);
}
