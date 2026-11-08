/** Year captured when this module is evaluated during `next build` (static HTML). */
const COPYRIGHT_YEAR = new Date().getFullYear();

/** Copyright and licence footer shared by every page. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-6 text-sm text-muted-foreground">
        <span>&copy; {COPYRIGHT_YEAR} Jamie Smith</span>
        <span>MIT License</span>
      </div>
    </footer>
  );
}
