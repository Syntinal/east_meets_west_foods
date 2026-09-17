import type { CSSProperties } from "react";

// Plain-language walkthrough for the owner, shown above the default
// dashboard. Uses native <details>/<summary> instead of a custom accordion
// so it inherits Payload's admin typography/theme (light + dark) for free
// and needs no client-side JS.
//
// Rewritten 2026-09 to match the real, current click-paths — the previous
// version described a "Create New" button and a Title/Post-vs-Announcement
// News flow that no longer exist (News was redesigned around a single
// message field + a 4-step wizard; Menu Items/News/Testimonials all moved
// to the list+live-preview split view with its own "+ New <Thing>"/
// "Edit →" wording, and out of the sidebar's old flat list into "Site
// Pages"). This is plain hardcoded copy, not generated from the real UI, so
// it can go stale exactly the same way again — if a click-path this
// describes changes (a button's wording, a step's order, a field's label),
// update this file in the same change, don't leave it for later.
const boxStyle: CSSProperties = {
  border: "1px solid var(--theme-elevation-150, #ddd)",
  borderRadius: 4,
  padding: 20,
  marginBottom: 24,
};

const stepsStyle: CSSProperties = {
  margin: "8px 0 0",
  paddingLeft: 20,
  lineHeight: 1.6,
};

export function GettingStarted() {
  return (
    <div style={boxStyle}>
      <h3 style={{ marginTop: 0 }}>Quick guide</h3>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Three things you'll do most often. Click one to see the steps.
      </p>

      <details>
        <summary>Change a menu item (price, description, or photo)</summary>
        <ol style={stepsStyle}>
          <li>
            Click <strong>Menu</strong> under <strong>Site Pages</strong> in the left sidebar.
          </li>
          <li>
            Find the dish in the list. Clicking it just updates the preview on the
            right — click <strong>Edit →</strong> next to it to actually open and change it.
          </li>
          <li>Edit the price, description, or photo.</li>
          <li>
            Click <strong>Publish</strong> (not just Save draft) so visitors
            see the change — Save draft only saves it for you to keep
            editing later.
          </li>
        </ol>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Post a news update or announcement</summary>
        <ol style={stepsStyle}>
          <li>
            Click <strong>News</strong> under <strong>Site Pages</strong> in the left sidebar,
            then <strong>+ New News Post</strong>.
          </li>
          <li>
            <strong>Step 1 — Add a photo or video:</strong> add a photo, or use the{" "}
            <strong>Video Studio</strong> to add a video instead (with an optional caption
            and background music). Either one is enough — you don't need both.
          </li>
          <li>
            <strong>Step 2 — Write your post:</strong> one text box is the whole post — it's
            what shows on the News page, and it's sent as-is as the caption if you post to
            social media.
          </li>
          <li>
            <strong>Step 3 — Choose where to post:</strong> check any of Facebook, Instagram,
            or TikTok to have it posted there automatically when you publish.
          </li>
          <li>
            <strong>Step 4 — Feature on the homepage?:</strong> check{" "}
            <strong>Feature this as the banner on the homepage</strong> if you want it to show
            as the homepage's banner. Optional — skip it for a regular update.
          </li>
          <li>Click <strong>Publish</strong> when it's ready to go live.</li>
        </ol>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Add a customer testimonial</summary>
        <ol style={stepsStyle}>
          <li>
            Click <strong>Testimonials</strong> under <strong>Site Pages</strong> in the left
            sidebar.
          </li>
          <li>
            Click <strong>View Google Reviews ↗</strong> at the top of the list to open your
            Google listing in a new tab, and find a review you like.
          </li>
          <li>Back in Testimonials, click <strong>+ New Testimonial</strong>.</li>
          <li>Copy in the review text, the customer's name, and their star rating.</li>
          <li>Click <strong>Publish</strong> to add it to the website.</li>
        </ol>
      </details>
    </div>
  );
}
