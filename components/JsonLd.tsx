export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Structured data built by our own code. Some values (business name,
      // address) are owner-editable, so "<" is escaped to keep a stray
      // "</script>" from ending the tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
