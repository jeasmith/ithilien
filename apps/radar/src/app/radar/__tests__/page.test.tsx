import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RadarPage from "@/app/radar/page";

describe("RadarPage", () => {
  it("renders the digest heading", () => {
    render(<RadarPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /what is worth/i,
    );
  });

  it("keeps the header link inside this application", () => {
    render(<RadarPage />);

    const link = screen.getByRole("link", { name: "radar" });
    expect(link).toHaveAttribute("href", "/radar");
    // "same" means an in-app client-side transition rather than a full load.
    expect(link).toHaveAttribute("data-zone", "same");
  });

  it("describes itself as an architectural digest", () => {
    render(<RadarPage />);

    expect(screen.getByText(/an architectural digest/i)).toBeInTheDocument();
  });

  it("renders every placeholder digest entry", () => {
    render(<RadarPage />);

    const entries = screen.getAllByRole("heading", { level: 2 });
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent(/microfrontends on a shared origin/i);
  });

  it("links back to Ithilien as a cross-application navigation", () => {
    render(<RadarPage />);

    const link = screen.getByRole("link", { name: "ithilien" });
    expect(link).toHaveAttribute("href", "/");
    // Ithilien is a separate deployment, so this must resolve to that
    // application and trigger a full navigation, not a client-side transition.
    // data-zone carries the owning application's key, which is the fixture
    // name here and a hash in a real build.
    expect(link).toHaveAttribute("data-zone", "ithilien");
  });

  it("renders the footer with copyright and license", () => {
    render(<RadarPage />);

    expect(screen.getByText(/jamie smith/i)).toBeInTheDocument();
    expect(screen.getByText("MIT License")).toBeInTheDocument();
  });
});
