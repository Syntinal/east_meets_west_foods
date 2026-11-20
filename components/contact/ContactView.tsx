import { addressLines, mapsEmbedUrl, mapsSearchUrl, telHref, type BusinessInfo } from "@/lib/businessInfo";

export type ContactDoc = {
  heading?: string | null;
  subtitle?: string | null;
  blurb?: string | null;
  mapLinkText?: string | null;
};

// Shared between the plain server-rendered /contact page and its
// live-preview counterpart. The page's own words come from the Contact
// global; the name, address, phone and map come from the business info
// record (globals/BusinessInfo.ts), the same source Google and Facebook get.
export function ContactView({ contact, business }: { contact: ContactDoc; business: BusinessInfo }) {
  const lines = addressLines(business.address);
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
              <p className="eyebrow">{business.name}</p>
              {contact.subtitle && <p className="muted-text">{contact.subtitle}</p>}
              {lines.length > 0 && (
                <div className="visit-row">
                  <strong>Address</strong>
                  <span>
                    {lines.map((line, i) => (
                      <span key={i}>
                        {i > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {business.phone && (
                <div className="visit-row">
                  <strong>Phone</strong>
                  <span>
                    <a href={telHref(business.phone)}>{business.phone}</a>
                  </span>
                </div>
              )}
              {contact.blurb && <p className="muted-text contact-blurb">{contact.blurb}</p>}
            </div>
            <div className="visit-map">
              <iframe
                src={mapsEmbedUrl(business.address)}
                title={`${business.name} location on Google Maps`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
              <a
                className="visit-map-overlay"
                href={mapsSearchUrl(business.address)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open East Meets West location in Google Maps"
              >
                <span className="visit-map-cta">{contact.mapLinkText || "Open in Google Maps →"}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
