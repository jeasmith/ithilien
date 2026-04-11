import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "../page";

describe("HomePage", () => {
  it("renders the site heading", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /a place to try out new stuff/i,
    );
  });

  it("renders the site name in the header", () => {
    render(<HomePage />);

    expect(screen.getByText("ithilien")).toBeInTheDocument();
  });

  it("renders the description paragraph", () => {
    render(<HomePage />);

    expect(
      screen.getByText(/personal repository of experiments/i),
    ).toBeInTheDocument();
  });

  it("renders navigation metadata links", () => {
    render(<HomePage />);

    expect(screen.getByText("Built with Next.js")).toBeInTheDocument();
    expect(screen.getByText("Deployed on Vercel")).toBeInTheDocument();
  });

  it("renders the GitHub source link", () => {
    render(<HomePage />);

    const link = screen.getByRole("link", { name: /source on github/i });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/jeasmith/ithilien",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the footer with copyright and license", () => {
    render(<HomePage />);

    expect(screen.getByText(/jamie smith/i)).toBeInTheDocument();
    expect(screen.getByText("MIT License")).toBeInTheDocument();
  });
});
