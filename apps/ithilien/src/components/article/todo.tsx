/**
 * A visible note in a draft article: what a section still needs to say.
 * Delete each one as its section is written; the article is not ready to
 * publish while any remain.
 */
export function Todo({ children }: { children: React.ReactNode }) {
  return (
    <aside className="my-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground [&_li]:my-1 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
      <p className="font-medium text-foreground">To write</p>
      {children}
    </aside>
  );
}
