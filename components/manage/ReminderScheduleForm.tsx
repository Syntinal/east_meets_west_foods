"use client";

import { useState } from "react";
import { DAYS, describeSchedule, GAP_CHOICES, type ReminderSchedule } from "@/lib/manage/reminderSchedule";
import { saveReminderSchedule } from "@/app/(manage)/manage/reminders/actions";

// "How often": which days to check, how long without a post before a
// reminder, and pause. Saved with one explicit button.
export function ReminderScheduleForm({ initial }: { initial: ReminderSchedule }) {
  const [saved, setSaved] = useState(initial);
  const [days, setDays] = useState<string[]>(initial.checkDays);
  const [hours, setHours] = useState(initial.minHoursSinceLastPost);
  const [paused, setPaused] = useState(!initial.enabled);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  const current: ReminderSchedule = { enabled: !paused, checkDays: days, minHoursSinceLastPost: hours };
  const changed = JSON.stringify(current) !== JSON.stringify(saved);
  // An unusual value set in /admin (e.g. 40 hours) still shows as a choice.
  const gapChoices = GAP_CHOICES.some((g) => g.hours === hours) ? GAP_CHOICES : [...GAP_CHOICES, { hours, label: `${hours} hours` }];

  async function save() {
    setBusy(true);
    setNotice(null);
    const r = await saveReminderSchedule(current);
    setBusy(false);
    if (r.ok) {
      setSaved({ ...current, checkDays: DAYS.map((d) => d.value).filter((d) => days.includes(d)) });
      setNotice({ text: `Saved. ${r.summary}` });
    } else {
      setNotice({ text: r.message, error: true });
    }
  }

  return (
    <>
      <p className="m-notice">{describeSchedule(saved)}</p>

      <fieldset className="m-fieldset" disabled={paused}>
        <legend className="m-label">Which days should we check?</legend>
        <div className="m-day-grid">
          {DAYS.map((d) => {
            const on = days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                className={`m-day ${on ? "m-day--on" : ""}`}
                aria-pressed={on}
                aria-label={d.plural}
                onClick={() => setDays(on ? days.filter((x) => x !== d.value) : [...days, d.value])}
              >
                {on && <span aria-hidden="true">✓ </span>}
                {d.short}
              </button>
            );
          })}
        </div>
        <p className="m-hint" style={{ marginTop: 8 }}>
          Reminders come in the morning, around 9.
        </p>
      </fieldset>

      <fieldset className="m-fieldset" disabled={paused}>
        <legend className="m-label">Remind me if I haven&apos;t posted in…</legend>
        <ul className="m-choices m-choices--compact">
          {gapChoices.map((g) => {
            const on = hours === g.hours;
            return (
              <li key={g.hours}>
                <button type="button" className={`m-choice ${on ? "m-choice--on" : ""}`} aria-pressed={on} onClick={() => setHours(g.hours)}>
                  <span className="m-choice-mark" aria-hidden="true">
                    {on ? "✓" : ""}
                  </span>
                  <span className="m-choice-label">{g.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="m-field">
        <button
          type="button"
          className={`m-choice ${paused ? "m-choice--on" : ""}`}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          <span className="m-choice-mark" aria-hidden="true">
            {paused ? "✓" : ""}
          </span>
          <span>
            <span className="m-choice-label">Pause all reminders</span>
            <span className="m-choice-state">For vacations or slow weeks. Turn this off to start them again.</span>
          </span>
        </button>
      </div>

      {notice && (
        <div className={`m-notice ${notice.error ? "m-notice--error" : "m-notice--good"}`} role="status">
          {notice.text}
        </div>
      )}

      <button type="button" className="m-btn m-btn--primary m-btn--block" onClick={save} disabled={busy || !changed}>
        {busy ? "Saving…" : "Save reminder settings"}
      </button>
    </>
  );
}
