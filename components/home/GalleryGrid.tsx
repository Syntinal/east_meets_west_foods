"use client";

import { useRef, useState } from "react";

export type GalleryPhoto = {
  id?: string;
  image?: { url?: string | null; alt?: string | null } | string | null;
  caption?: string | null;
};

type ResolvedPhoto = { url: string; alt: string };

function resolvePhoto(photo: GalleryPhoto): ResolvedPhoto | null {
  const image = photo.image && typeof photo.image === "object" ? photo.image : null;
  if (!image?.url) return null;
  // Caption is admin-only content — used as the accessibility description,
  // never rendered visibly on the page.
  return { url: image.url, alt: photo.caption ?? image.alt ?? "" };
}

// Responsive grid, click a photo to enlarge it in a native <dialog> — that
// gets us a focus trap and Esc-to-close for free, no extra library needed.
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<ResolvedPhoto | null>(null);

  const resolved = photos.map(resolvePhoto).filter((photo): photo is ResolvedPhoto => photo !== null);
  if (resolved.length === 0) return null;

  function open(photo: ResolvedPhoto) {
    setActive(photo);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <div className="gallery-grid">
        {resolved.map((photo, i) => (
          <button
            key={i}
            type="button"
            className="gallery-thumb"
            onClick={() => open(photo)}
            aria-label={`Enlarge photo${photo.alt ? `: ${photo.alt}` : ""}`}
          >
            <img src={photo.url} alt={photo.alt} loading="lazy" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="gallery-dialog"
        onClose={() => setActive(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        {active && (
          <>
            <button type="button" className="gallery-dialog-close" onClick={close} aria-label="Close">
              ×
            </button>
            <img src={active.url} alt={active.alt} />
          </>
        )}
      </dialog>
    </>
  );
}
