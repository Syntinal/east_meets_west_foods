import Link from "next/link";

type Props = {
  /** Omit when the page renders its own headings (e.g. a multi-step screen). */
  title?: string;
  intro?: React.ReactNode;
  /** Where "Back" goes. Omit on the home screen. */
  back?: { href: string; label?: string };
  /** Hide the header's help link (used on the help screen itself). */
  hideHelp?: boolean;
  children: React.ReactNode;
};

// The frame every /manage screen shares: a Back button (top left) and a
// Get help button (top right) are always in the same place, so there's
// never a screen without a way out or a way to ask for help.
export function Screen({ title, intro, back, hideHelp, children }: Props) {
  return (
    <>
      <header className="m-header">
        {back ? (
          <Link href={back.href} className="m-btn m-btn--small">
            ← {back.label ?? "Back"}
          </Link>
        ) : (
          <span className="m-brand">East Meets West</span>
        )}
        {!hideHelp && (
          <Link href="/manage/help" className="m-btn m-btn--small">
            📞 Get help
          </Link>
        )}
      </header>
      <main className="m-main">
        {title && <h1>{title}</h1>}
        {intro && <p className="m-intro">{intro}</p>}
        {children}
      </main>
    </>
  );
}
