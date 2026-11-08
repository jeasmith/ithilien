import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FlowStepper, type FlowStep } from "@/components/article/flow-stepper";

const steps: FlowStep[] = [
  {
    from: "App",
    to: "Auth server",
    title: "Asks for a code",
    message: [
      { text: "scope=read", only: "oauth" },
      { text: "scope=openid read", only: "oidc" },
    ],
    explanation: "First explanation.",
  },
  {
    from: "App",
    title: "Checks the ID token",
    oidc: true,
    explanation: "OIDC only.",
  },
  {
    from: "App",
    to: "API",
    title: "Calls the API",
    explanation: "Last explanation.",
  },
];

function renderStepper() {
  render(<FlowStepper label="Test flow" steps={steps} oidcToggle />);
  return userEvent.setup();
}

describe("FlowStepper", () => {
  it("starts on the first step", () => {
    renderStepper();

    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("First explanation.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("moves forward and back", async () => {
    const user = renderStepper();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("OIDC only.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("First explanation.")).toBeInTheDocument();
  });

  it("jumps to a step chosen from the list", async () => {
    const user = renderStepper();

    await user.click(screen.getByRole("button", { name: /calls the api/i }));

    expect(screen.getByText("Last explanation.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("hides OpenID Connect steps and lines when the toggle is off", async () => {
    const user = renderStepper();
    expect(screen.getByText("scope=openid read")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /openid connect/i }));

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.queryByText("Checks the ID token")).not.toBeInTheDocument();
    expect(screen.getByText("scope=read")).toBeInTheDocument();
    expect(screen.queryByText("scope=openid read")).not.toBeInTheDocument();
  });
});
