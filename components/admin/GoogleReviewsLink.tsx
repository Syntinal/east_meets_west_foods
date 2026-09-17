// Just a link to the public Google Maps listing — no API call, nothing
// fetched or stored. Keeps the "grab a good review" workflow entirely
// outside Google's Places API terms, since we never touch their API here.
const GOOGLE_MAPS_URL =
  "https://www.google.com/maps/place/East+Meets+West+Dumpling+Bar/@48.3013996,-116.5500785,17z/data=!3m1!4b1!4m6!3m5!1s0x5363d1966a6b04e9:0x6d04125dba42b761!8m2!3d48.3013996!4d-116.5475036!16s%2Fg%2F11z8jv38bw";

export function GoogleReviewsLink() {
  return (
    <div
      style={{
        border: "1px solid var(--theme-elevation-150, #ddd)",
        borderRadius: 4,
        padding: 16,
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn--style-secondary">
        View Google Reviews ↗
      </a>
      <span style={{ fontSize: 13, opacity: 0.7 }}>
        Opens the Google Maps listing in a new tab — copy any great reviews you find into a new Testimonial below.
      </span>
    </div>
  );
}
