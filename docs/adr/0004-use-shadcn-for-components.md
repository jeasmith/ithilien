# ADR-0004: Use shadcn/ui as the Component Foundation

## Status

Accepted

## Context

We need a component library approach. The site will grow to include various UI
elements, and we want consistency without over-investing in a custom design
system upfront. Requirements:

- Components must be accessible (WCAG 2.1 AA).
- Customisable — we need to own the code, not depend on a third-party runtime.
- Compatible with Tailwind CSS v4.
- React Server Component friendly.

Alternatives considered:

- **Radix Primitives + custom styling**: Maximum control, but significant
  upfront effort to style every component.
- **Material UI / Chakra UI**: Full design systems, but opinionated visual
  language that's difficult to override for a custom look.
- **Headless UI (Tailwind Labs)**: Good, but smaller component set than shadcn.
- **Building from scratch**: Tempting for learning, but slow for shipping.

## Decision

Use **shadcn/ui** as the foundation for UI components.

shadcn/ui is not a traditional component library — it generates component source
code directly into the project. This means we own every line of code, can modify
components freely, and have no runtime dependency on the library itself. The
components are built on top of Radix primitives (via Base UI) and styled with
Tailwind CSS.

## Consequences

### Positive

- **Ownership**: Components live in our codebase as source files, not in
  `node_modules`. We can modify them without forking a library.
- **Accessibility**: Built on Radix/Base UI primitives with keyboard navigation,
  ARIA attributes, and focus management baked in.
- **Tailwind-native**: Styling uses Tailwind utility classes and CSS variables,
  making customisation straightforward.
- **Incremental adoption**: We add only the components we need, keeping the
  bundle small.
- **Active community**: Large ecosystem of extensions and examples.

### Negative

- Generated code needs to be maintained by us — upstream improvements require
  manual re-generation or merging.
- The `cn()` utility and class-variance-authority add a small conceptual
  overhead for contributors unfamiliar with the pattern.

### Neutral

- shadcn/ui's design tokens (CSS custom properties) provide a good starting
  point that we can later formalise into a proper design system.

## References

- [shadcn/ui](https://ui.shadcn.com)
- [Base UI](https://base-ui.com)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [ADR-0009: Use Tailwind CSS v4 for Styling](./0009-use-tailwind-css-v4-for-styling.md)
