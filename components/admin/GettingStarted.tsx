import type { CSSProperties } from "react";

// Plain-language walkthrough for the owner, shown above the default
// dashboard. Uses native <details>/<summary> instead of a custom accordion
// so it inherits Payload's admin typography/theme (light + dark) for free
// and needs no client-side JS.
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
          <li>Click <strong>Menu Items</strong> in the left sidebar.</li>
          <li>Click the dish you want to change.</li>
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
          <li>Click <strong>News</strong> in the left sidebar, then <strong>Create New</strong>.</li>
          <li>Add a title and write your update.</li>
          <li>
            Choose <strong>Post</strong> for a regular update, or <strong>Announcement</strong> if
            you also want it to show as a banner on the homepage.
          </li>
          <li>Click <strong>Publish</strong> when it's ready to go live.</li>
        </ol>
      </details>

      <details style={{ marginTop: 12 }}>
        <summary>Add a customer testimonial</summary>
        <ol style={stepsStyle}>
          <li>Click <strong>Testimonials</strong> in the left sidebar.</li>
          <li>
            Click <strong>View Google Reviews</strong> at the top of the list to open your
            Google listing in a new tab, and find a review you like.
          </li>
          <li>Back in Testimonials, click <strong>Create New</strong>.</li>
          <li>Copy in the review text, the customer's name, and their star rating.</li>
          <li>Click <strong>Publish</strong> to add it to the website.</li>
        </ol>
      </details>
    </div>
  );
}
