export type PriceOption = { label: string; price: string; note?: string | null };
export type MenuItemDoc = {
  id: string;
  title: string;
  tag?: string | null;
  group: "main" | "extras";
  description?: string | null;
  image?: { url?: string | null; alt?: string | null } | string | null;
  priceOptions: PriceOption[];
  order?: number | null;
};

// Shared between the plain server-rendered /menu page and its live-preview
// counterpart — same markup either way, just fed different data.
export function MenuGridView({ items }: { items: MenuItemDoc[] }) {
  const mainItems = items.filter((item) => item.group === "main");
  const extraItems = items.filter((item) => item.group === "extras");

  return (
    <>
      <section className="section menu-main">
        <div className="container">
          <header className="section-head">
            <div className="text-panel text-panel--inline">
              <p className="eyebrow">Menu</p>
              <h1 className="section-title">East Meets West Menu</h1>
              <p className="section-lede">
                Three offerings, made well — dumpling flavors change weekly. One of
                the Sandpoint area&apos;s only spots for authentic hand-folded Northern
                Chinese dumplings, in Ponderay.
              </p>
            </div>
          </header>

          <div className="menu-grid">
            {mainItems.map((item) => {
              const image = item.image && typeof item.image === "object" ? item.image : null;
              return (
                <article className="menu-card" key={item.id}>
                  {image?.url && (
                    <div className="menu-card-img">
                      <img src={image.url} alt={image.alt ?? item.title} />
                    </div>
                  )}
                  <div className="menu-card-body">
                    {item.tag && <p className="card-tag">{item.tag}</p>}
                    <h2>{item.title}</h2>
                    {item.description && <p>{item.description}</p>}
                    <ul className="price-list">
                      {item.priceOptions.map((option, i) => (
                        <li key={i}>
                          <span>{option.label}</span>
                          <strong>{option.price}</strong>
                          {option.note && <em>{option.note}</em>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section menu-extras">
        <div className="container">
          <div className="extras-grid">
            {extraItems.map((item) => (
              <div className="extras-card" key={item.id}>
                <h3>{item.title}</h3>
                <ul className="extras-list">
                  {item.priceOptions.map((option, i) => (
                    <li key={i}>
                      <span>{option.label}</span>
                      <strong>{option.price}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="menu-note text-panel">
            Dumpling flavors change weekly. In the coming months we plan on
            offering an &quot;Americana&quot; line of dumplings under the moniker — yes, as
            Americans, we change everything. Some initial ideas include Memphis
            Sweet BBQ as well as other flavors.
          </p>
          <p className="menu-note muted text-panel">
            There are gluten and soy-based products (soy sauce, oil, etc.) in
            this food, as this is part of maintaining authenticity.
          </p>
        </div>
      </section>
    </>
  );
}
