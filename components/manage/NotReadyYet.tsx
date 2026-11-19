import { Screen } from "./Screen";

// Temporary stand-in for the task screens built in later phases. Points at
// the matching spot in the regular editor so nothing is a dead end while
// /manage is being built. Removed screen by screen as each phase lands.
export function NotReadyYet({ title, adminHref }: { title: string; adminHref: string }) {
  return (
    <Screen title={title} back={{ href: "/manage", label: "Home" }}>
      <div className="m-notice m-notice--warn">
        <p style={{ margin: 0 }}>This part is still being built. For now, you can do this in the regular editor.</p>
      </div>
      <a href={adminHref} className="m-btn m-btn--block">
        Open the regular editor
      </a>
    </Screen>
  );
}
