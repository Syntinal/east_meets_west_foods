export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Trusted, hardcoded structured data — not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
