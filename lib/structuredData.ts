// Base Restaurant/LocalBusiness JSON-LD shared across pages.
// Individual pages spread this and add page-specific fields (hasMap, hasMenu).
export const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "LocalBusiness"],
  name: "East Meets West Dumplings Bar",
  description:
    "Authentic Northern Chinese dumplings, bao buns, and homemade garlic sauce at fast-food prices, served in Ponderay, Idaho.",
  url: "https://eastmeetswestfoods.co/",
  image: "https://eastmeetswestfoods.co/assets/photos/bao-tray.jpeg",
  address: {
    "@type": "PostalAddress",
    streetAddress: "476534 US HWY 95, Suite B",
    addressLocality: "Ponderay",
    addressRegion: "ID",
    postalCode: "83852",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 48.305,
    longitude: -116.534,
  },
  servesCuisine: ["Chinese", "Northern Chinese", "Dumplings"],
  priceRange: "$",
  telephone: "+1-208-627-6283",
  areaServed: [
    { "@type": "City", name: "Sandpoint", containedInPlace: { "@type": "State", name: "Idaho" } },
    { "@type": "City", name: "Ponderay", containedInPlace: { "@type": "State", name: "Idaho" } },
    { "@type": "AdministrativeArea", name: "Bonner County" },
    { "@type": "City", name: "Kootenai", containedInPlace: { "@type": "State", name: "Idaho" } },
    { "@type": "City", name: "Sagle", containedInPlace: { "@type": "State", name: "Idaho" } },
  ],
};
