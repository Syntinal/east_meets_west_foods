export default function DraftModeBanner() {
  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        textAlign: "center",
        padding: "0.5rem 1rem",
        fontSize: "0.875rem",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      Viewing a draft preview — this isn&apos;t visible to site visitors yet.{" "}
      <a href="/next/exit-preview" style={{ color: "#fff", textDecoration: "underline" }}>
        Exit preview
      </a>
    </div>
  );
}
