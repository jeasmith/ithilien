import { describe, expect, it } from "vitest";
import {
  createCodeChallenge,
  createCodeVerifier,
  isValidVerifier,
} from "@/components/article/pkce";

describe("PKCE helpers", () => {
  it("matches the S256 example in RFC 7636 Appendix B", async () => {
    await expect(
      createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).resolves.toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("makes verifiers the RFC accepts", () => {
    const verifier = createCodeVerifier();

    expect(verifier).toHaveLength(43);
    expect(isValidVerifier(verifier)).toBe(true);
  });

  it("rejects verifiers that are too short or use other characters", () => {
    expect(isValidVerifier("short")).toBe(false);
    expect(isValidVerifier(`${"a".repeat(42)}!`)).toBe(false);
  });
});
