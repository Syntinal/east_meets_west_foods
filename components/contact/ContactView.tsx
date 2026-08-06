export type ContactDoc = {
  heading?: string | null;
  subtitle?: string | null;
  address?: string | null;
  phone?: string | null;
  blurb?: string | null;
};

// Derives a tel: href from a phone number string — assumes a 10-digit US
// number (see the `phone` field's admin description in globals/Contact.ts).
// Falls back to a plain digit string for anything else, rather than
// guessing at a country code.
function toTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `tel:+1${digits}` : `tel:${digits}`;
}

// Shared between the plain server-rendered /contact page and its
// live-preview counterpart. The map embed/overlay link stay hardcoded here
// (not sourced from `contact.address`) — see globals/Contact.ts's comment
// on why.
export function ContactView({ contact }: { contact: ContactDoc }) {
  return (
    <main>
      <section className="section">
        <div className="container">
          <header className="section-head">
            <div className="text-panel text-panel--inline">
              <p className="eyebrow">Contact</p>
              <h1 className="section-title">{contact.heading}</h1>
            </div>
          </header>

          <div className="visit-grid">
            <div className="text-panel">
              <p className="eyebrow">East Meets West Dumplings Bar</p>
              {contact.subtitle && <p className="muted-text">{contact.subtitle}</p>}
              {contact.address && (
                <div className="visit-row">
                  <strong>Address</strong>
                  <span>
                    {contact.address.split("\n").map((line, i) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {contact.phone && (
                <div className="visit-row">
                  <strong>Phone</strong>
                  <span>
                    <a href={toTelHref(contact.phone)}>{contact.phone}</a>
                  </span>
                </div>
              )}
              {contact.blurb && <p className="muted-text">{contact.blurb}</p>}
            </div>
            <div className="visit-map">
              <iframe
                src="https://www.google.com/maps?q=476534+US+HWY+95+Ponderay+ID+83852&z=15&output=embed"
                title="East Meets West Dumplings Bar location on Google Maps"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <a
                className="visit-map-overlay"
                href="https://www.google.com/maps/search/?api=1&query=476534+US+HWY+95+Suite+B+Ponderay+ID+83852"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open East Meets West location in Google Maps"
              >
                <span className="visit-map-cta">Open in Google Maps →</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
