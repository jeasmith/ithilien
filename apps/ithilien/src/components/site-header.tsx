import Link from "next/link";

/** Site name bar shared by the home page and articles. */
export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center px-6">
        <Link
          href="/"
          className="font-mono text-lg font-semibold tracking-tight"
        >
          ithilien
        </Link>
      </div>
    </header>
  );
}
