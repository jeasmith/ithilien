"use client";

/**
 * Steps through a protocol flow one message at a time: who sends what to
 * whom, the HTTP on the wire, and why. Steps marked `oidc` are what OpenID
 * Connect adds on top of OAuth 2.0, and a toggle hides them so a reader can
 * compare the two.
 */
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

/** One line of an HTTP message, optionally shown only with or without OIDC. */
export interface FlowLine {
  text: string;
  only?: "oauth" | "oidc";
}

/** One message, or one piece of work a party does on its own. */
export interface FlowStep {
  from: string;
  /** Omit for work a party does by itself, such as checking a value. */
  to?: string;
  title: string;
  /** The message on the wire, if there is one. */
  message?: FlowLine[];
  explanation: string;
  /** Present only when OpenID Connect is on. */
  oidc?: boolean;
}

interface FlowStepperProps {
  /** Accessible name for the whole widget. */
  label: string;
  steps: FlowStep[];
  /** Offer the OpenID Connect toggle. */
  oidcToggle?: boolean;
}

/** Renders a flow that the reader advances one step at a time. */
export function FlowStepper({
  label,
  steps,
  oidcToggle = false,
}: FlowStepperProps) {
  const [oidc, setOidc] = useState(true);
  const [index, setIndex] = useState(0);

  const visible = steps.filter((step) => oidc || !step.oidc);
  const current = Math.min(index, visible.length - 1);
  const step = visible[current];
  const lines =
    step.message?.filter(
      (line) =>
        line.only === undefined || line.only === (oidc ? "oidc" : "oauth"),
    ) ?? [];

  return (
    <section
      aria-label={label}
      className="not-prose my-8 rounded-xl border border-border p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Step {current + 1} of {visible.length}
        </p>
        {oidcToggle && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={oidc}
              onChange={(event) => {
                setOidc(event.target.checked);
                setIndex(0);
              }}
            />
            Include OpenID Connect
          </label>
        )}
      </div>

      <ol className="mt-4 space-y-1 text-sm">
        {visible.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === current ? "step" : undefined}
              className={cn(
                "w-full rounded-md px-2 py-1 text-left transition-colors hover:bg-muted",
                i === current && "bg-muted font-medium",
                i > current && "text-muted-foreground",
              )}
            >
              <span className="font-mono text-xs">
                {s.from}
                {s.to ? ` → ${s.to}` : ""}
              </span>{" "}
              {s.title}
              {s.oidc && (
                <span className="ml-2 rounded border border-border px-1 text-xs">
                  OIDC
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="mt-6 border-t border-border pt-4">
        <h3 className="font-semibold">{step.title}</h3>
        {lines.length > 0 && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
            {lines.map((line) => (
              <span
                key={line.text}
                className={cn("block", line.only === "oidc" && "font-semibold")}
              >
                {line.text}
              </span>
            ))}
          </pre>
        )}
        <p className="mt-3 leading-relaxed">{step.explanation}</p>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => setIndex(current - 1)}
          disabled={current === 0}
        >
          Previous
        </Button>
        <Button
          onClick={() => setIndex(current + 1)}
          disabled={current === visible.length - 1}
        >
          Next
        </Button>
      </div>
    </section>
  );
}
