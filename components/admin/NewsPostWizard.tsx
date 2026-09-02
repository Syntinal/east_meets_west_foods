"use client";

import type { CSSProperties } from "react";
import { useField } from "@payloadcms/ui";

// The Back/Next control strip for the News edit screen's step-by-step
// wizard — see collections/News.ts's WIZARD_STEPS/atStep(). Every other
// field on this collection is gated to one step via `admin.condition`
// reading the shared `wizardStep` field this component owns; this is the
// only piece that moves it. Same "custom component drives a hidden sibling
// field via useField()" idiom as components/admin/CloudinaryVideoStudio.tsx.
//
// Deliberately doesn't block "Next" on missing/invalid fields (e.g. an
// empty message) — Payload's own required-field validation already stops
// Publish/Save from succeeding with a clear inline error; duplicating that
// gating here would just be a second, easier-to-drift-out-of-sync copy of
// the same rule. This is purely about which step is in view, not a
// substitute for real validation.
const wrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 16px",
  marginBottom: 16,
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 4,
  background: "var(--theme-elevation-50)",
};

const stepLabelStyle: CSSProperties = { fontSize: 15, textAlign: "center", flex: 1 };
const stepCountStyle: CSSProperties = { display: "block", fontSize: 12, color: "var(--theme-elevation-500)" };
const lastStepHintStyle: CSSProperties = { fontSize: 12, color: "var(--theme-elevation-500)" };
// `.btn` has no size class applied here (see the CloudinaryVideoStudio.tsx
// gotcha in CLAUDE.md — without a `btn--size-medium`-style class the base
// rule's own padding variables default to 0), which left "← Back"/"Next →"
// with their text sitting flush against the button edges. Adding horizontal
// padding directly rather than pulling in Payload's real Button component,
// since these two also need the disabled/hint-swap logic above that doesn't
// map cleanly onto Button's props.
const navButtonStyle: CSSProperties = { paddingLeft: 20, paddingRight: 20 };

export function NewsPostWizardNav({ steps }: { steps: readonly string[] }) {
  const { value, setValue } = useField<number>({ path: "wizardStep" });
  const step = value && value >= 1 && value <= steps.length ? value : 1;
  const isLastStep = step >= steps.length;

  return (
    <div style={wrapStyle}>
      {/* btn--no-margin on both — Payload's own .btn class applies a
          ~24px top+bottom margin-block by default (see
          CloudinaryVideoStudio.tsx's Preview/Remove-video buttons for the
          same fix), which would otherwise make this bar taller than its
          own deliberate 14px padding. */}
      <button
        type="button"
        className="btn btn--style-secondary btn--no-margin"
        style={navButtonStyle}
        disabled={step <= 1}
        onClick={() => setValue(step - 1)}
      >
        ← Back
      </button>
      <span style={stepLabelStyle}>
        <span style={stepCountStyle}>
          Step {step} of {steps.length}
        </span>
        <strong>{steps[step - 1]}</strong>
      </span>
      {/* On the last step there's nothing further to advance to — a
          disabled "Next →" with no explanation reads as broken (confirmed:
          this is exactly what got reported as a bug). Swap it for a plain
          hint pointing at Publish/Save Draft, which live in the document
          controls above this bar, not in the wizard itself. */}
      {isLastStep ? (
        <span style={lastStepHintStyle}>Use Publish or Save Draft above ↑</span>
      ) : (
        <button
          type="button"
          className="btn btn--style-primary btn--no-margin"
          style={navButtonStyle}
          onClick={() => setValue(step + 1)}
        >
          Next →
        </button>
      )}
    </div>
  );
}
