import type { Payload, PayloadRequest } from "payload";

export type ActivityEntry = {
  summary: string;
  status?: "success" | "failed" | "unknown";
  area?: "menu" | "page" | "post" | "review" | "photo" | "other";
  /** Email of who did it. Defaults to the request's signed-in user. */
  who?: string | null;
};

/**
 * Records one line of "Recent activity". Never throws — a logging problem
 * must never break the thing being logged.
 *
 * Pass `req` (inside a hook) for content changes: the entry is then written
 * in the SAME database transaction as the change, so if the change rolls
 * back, so does its "Saved…" line — the log never claims something happened
 * that didn't. Omit `req` for failures and for things that happened outside
 * our database (a Facebook post going out): those are written on their own
 * and survive even when the surrounding operation fails. (Verified on the
 * test DB: writes with the operation's req roll back with it; writes
 * without it don't.)
 */
export async function logActivity(payload: Payload, entry: ActivityEntry, req?: PayloadRequest): Promise<void> {
  try {
    await payload.create({
      collection: "activity-log",
      data: {
        summary: entry.summary.slice(0, 300),
        status: entry.status ?? "success",
        area: entry.area ?? "other",
        who: entry.who ?? (req?.user as { email?: string } | null | undefined)?.email ?? null,
      },
      overrideAccess: true,
      ...(req ? { req } : {}),
    });
  } catch (err) {
    payload.logger.error(`[activity-log] couldn't record "${entry.summary}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Shared "Saved… / Put … on the website" afterChange hook for the website page globals. */
export function pageActivityHook(pageLabel: string) {
  return async ({ doc, req, context }: { doc: { _status?: string }; req: PayloadRequest; context?: Record<string, unknown> }) => {
    if (context?.skipActivity) return;
    const summary =
      typeof context?.activity === "string"
        ? context.activity
        : doc._status === "published"
          ? `Put the ${pageLabel} page on the website`
          : `Saved changes to the ${pageLabel} page (not on the website yet)`;
    await logActivity(req.payload, { summary, area: "page" }, req);
  };
}
