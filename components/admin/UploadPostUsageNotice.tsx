import config from "@payload-config";
import { getPayload } from "payload";

// Shows "X of Y Facebook posts used this month" in the News list view, read
// from globals/UploadPostUsage.ts — a snapshot the afterChange hook in
// collections/News.ts writes after every *real* Upload-Post attempt (see
// that hook's comment; there's no separate "check my usage" call, this
// just reuses the `usage` object Upload-Post already includes on its own
// post responses). Renders nothing until that's happened at least once —
// which won't be until real UPLOAD_POST_API_KEY credentials are set and a
// real post goes out, so this stays invisible during mock-mode testing
// rather than showing a misleading "0 of 10".
export async function UploadPostUsageNotice() {
  const payload = await getPayload({ config });
  const usage = await payload.findGlobal({ slug: "upload-post-usage", overrideAccess: true });

  if (typeof usage?.count !== "number" || typeof usage?.limit !== "number") return null;

  const remaining = usage.limit - usage.count;
  const low = remaining <= 2;

  return (
    <div
      style={{
        border: `1px solid var(--theme-${low ? "warning" : "elevation"}-${low ? 500 : 150}, ${low ? "#f5a623" : "#ddd"})`,
        background: low ? "var(--theme-warning-100, #fdf3e0)" : undefined,
        borderRadius: 4,
        padding: "10px 16px",
        marginBottom: 24,
        fontSize: 13,
      }}
    >
      <strong>Facebook posts:</strong> {usage.count} of {usage.limit} used this month
      {usage.lastReset ? ` · resets ${usage.lastReset}` : ""}
      {low && " — running low"}
    </div>
  );
}
