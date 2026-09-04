"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useAllFormFields, useField, useFormProcessing } from "@payloadcms/ui";

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
//
// What this DOES do, though: jump to whichever step actually contains the
// problem. A field gated behind `admin.condition` is fully unmounted when
// its step isn't active (confirmed via WatchCondition.js — a failing
// condition returns `null`, not just visually hidden), so its own inline
// error message can never render on screen. Before this existed, a failed
// Publish on an empty "message" (step 2) surfaced only as a toast naming
// the raw field path ("message") while the owner sat on whatever step they
// happened to be on — a real dead end for someone who doesn't know the
// wizard's steps map onto Payload field names. FIELD_STEP is the one
// mapping to keep in sync with collections/News.ts's own field-to-step
// layout if a field ever moves steps.
const FIELD_STEP: { prefix: string; step: number }[] = [
  { prefix: "featuredImage", step: 1 },
  { prefix: "photoCaption", step: 1 },
  { prefix: "cloudinaryVideo", step: 1 },
  { prefix: "message", step: 2 },
  { prefix: "socialMedia", step: 3 },
  { prefix: "showAsHomepageBanner", step: 4 },
  { prefix: "bannerEndDate", step: 4 },
];

function stepForFieldPath(path: string): number | undefined {
  return FIELD_STEP.find((f) => path === f.prefix || path.startsWith(`${f.prefix}.`))?.step;
}

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
const warningTextStyle: CSSProperties = { color: "var(--theme-warning-500, #f5a623)" };
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

  const [fields] = useAllFormFields();
  const processing = useFormProcessing();
  const wasProcessingRef = useRef(false);

  // Jump to the first step with an invalid field the moment a Publish/Save
  // attempt finishes (a `processing: true -> false` transition — the same
  // window a submit's pass/fail result becomes known). Reading `fields` on
  // every render is cheap and harmless; the ref guard is what limits any
  // actual navigation to right after a real submit attempt, not every
  // keystroke. Ignores an in-progress autosave entirely — that runs through
  // BackgroundProcessingContext, a separate flag this doesn't read.
  useEffect(() => {
    if (wasProcessingRef.current && !processing) {
      let firstInvalidStep: number | undefined;
      for (const [path, fieldState] of Object.entries(fields)) {
        if (fieldState?.valid === false) {
          const invalidStep = stepForFieldPath(path);
          if (invalidStep !== undefined && (firstInvalidStep === undefined || invalidStep < firstInvalidStep)) {
            firstInvalidStep = invalidStep;
          }
        }
      }
      if (firstInvalidStep !== undefined && firstInvalidStep !== step) {
        setValue(firstInvalidStep);
      }
    }
    wasProcessingRef.current = processing;
  }, [processing, fields, step, setValue]);

  // True once the step currently in view is itself the one with the
  // problem — covers both "just auto-jumped here" and "the owner has since
  // clicked Back/Next away and come back without fixing it yet".
  const currentStepHasError = Object.entries(fields).some(
    ([path, fieldState]) => fieldState?.valid === false && stepForFieldPath(path) === step
  );

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
        {currentStepHasError && (
          <span style={{ ...stepCountStyle, ...warningTextStyle }}>⚠ This step needs your attention</span>
        )}
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
