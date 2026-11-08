import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PkceDemo } from "@/components/article/pkce-demo";

describe("PkceDemo", () => {
  it("shows the RFC 7636 example challenge first", async () => {
    render(<PkceDemo />);

    expect(
      await screen.findByText("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"),
    ).toBeInTheDocument();
  });

  it("explains an invalid verifier instead of hashing it", async () => {
    const user = userEvent.setup();
    render(<PkceDemo />);

    const input = screen.getByLabelText(/code_verifier/i);
    await user.clear(input);
    await user.type(input, "too-short");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/43 to 128/)).toBeInTheDocument();
  });
});
