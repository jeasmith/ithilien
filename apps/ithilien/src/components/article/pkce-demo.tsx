"use client";

/**
 * Lets the reader make a PKCE code verifier and watch its S256 challenge
 * change, to show that the challenge is public and the verifier is the secret.
 */
import { useEffect, useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
  createCodeChallenge,
  createCodeVerifier,
  isValidVerifier,
} from "./pkce";

/** RFC 7636 Appendix B's verifier, so the first render matches the RFC. */
const RFC_EXAMPLE = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

/** Renders an editable verifier and the challenge derived from it. */
export function PkceDemo() {
  const [verifier, setVerifier] = useState(RFC_EXAMPLE);
  const [challenge, setChallenge] = useState("");
  const valid = isValidVerifier(verifier);

  useEffect(() => {
    let cancelled = false;
    if (!valid) return;
    void createCodeChallenge(verifier).then((value) => {
      if (!cancelled) setChallenge(value);
    });
    return () => {
      cancelled = true;
    };
  }, [verifier, valid]);

  return (
    <section
      aria-label="PKCE code challenge"
      className="not-prose my-8 rounded-xl border border-border p-4 sm:p-6"
    >
      <label htmlFor="pkce-verifier" className="text-sm font-medium">
        code_verifier (kept secret by the app)
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="pkce-verifier"
          value={verifier}
          onChange={(event) => setVerifier(event.target.value)}
          spellCheck={false}
          aria-invalid={!valid}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
        />
        <Button
          variant="outline"
          onClick={() => setVerifier(createCodeVerifier())}
        >
          New random verifier
        </Button>
      </div>
      {!valid && (
        <p className="mt-2 text-sm text-destructive">
          A verifier is 43 to 128 letters, digits or the characters - . _ ~
        </p>
      )}

      <p className="mt-4 text-sm font-medium">
        code_challenge = BASE64URL(SHA-256(code_verifier))
      </p>
      <output
        aria-label="code_challenge"
        className="mt-2 block overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs"
      >
        {valid ? challenge : "—"}
      </output>
    </section>
  );
}
