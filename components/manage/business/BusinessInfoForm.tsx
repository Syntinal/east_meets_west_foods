"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  dateLabel,
  TIME_CHOICES,
  validateBusinessInfo,
  WEEKDAYS,
  type BusinessInfo,
  type SpecialDay,
  type WeekdayKey,
} from "@/lib/businessInfo";
import { saveBusinessInfo } from "@/app/(manage)/manage/business/actions";

// Change the phone, address, weekly hours and holidays. One "Save" sends it
// everywhere (website now; Google and Facebook once connected).

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select className="m-input" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {TIME_CHOICES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}

export function BusinessInfoForm({ initial, today }: { initial: BusinessInfo; today: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [info, setInfo] = useState(initial);
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [newDay, setNewDay] = useState<SpecialDay>({ date: "", label: "", closed: true, opensAt: "12:00", closesAt: "18:00" });

  const changed = JSON.stringify(info) !== JSON.stringify(saved);
  const addressChanged = JSON.stringify(info.address) !== JSON.stringify(saved.address);
  const problems = validateBusinessInfo(info);

  const setAddress = (k: keyof BusinessInfo["address"], v: string) => setInfo({ ...info, address: { ...info.address, [k]: v } });
  const setDay = (k: WeekdayKey, patch: Partial<BusinessInfo["hours"][WeekdayKey]>) =>
    setInfo({ ...info, hours: { ...info.hours, [k]: { ...info.hours[k], ...patch } } });
  const setSpecial = (i: number, patch: Partial<SpecialDay>) =>
    setInfo({ ...info, specialDays: info.specialDays.map((d, j) => (j === i ? { ...d, ...patch } : d)) });

  function addSpecialDay() {
    if (!newDay.date) return;
    if (info.specialDays.some((d) => d.date === newDay.date)) {
      setNotice({ text: `${dateLabel(newDay.date)} is already on the list.`, error: true });
      return;
    }
    setInfo({ ...info, specialDays: [...info.specialDays, newDay].sort((a, b) => a.date.localeCompare(b.date)) });
    setNewDay({ date: "", label: "", closed: true, opensAt: "12:00", closesAt: "18:00" });
    setNotice(null);
  }

  async function save() {
    setBusy(true);
    setNotice(null);
    const r = await saveBusinessInfo(info, { addressConfirmed });
    setBusy(false);
    if (r.ok) {
      setSaved(info);
      setAddressConfirmed(false);
      setNotice({ text: "Saved. The website is updated. Check the list above to see where else it's gone." });
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setNotice({ text: r.message, error: true });
    }
  }

  return (
    <>
      <h2 className="m-subhead">Phone number</h2>
      <label className="m-field">
        <span className="m-label">Phone</span>
        <input className="m-input" type="tel" inputMode="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
      </label>

      <h2 className="m-subhead">Address</h2>
      <label className="m-field">
        <span className="m-label">Street</span>
        <input className="m-input" value={info.address.street} onChange={(e) => setAddress("street", e.target.value)} />
      </label>
      <label className="m-field">
        <span className="m-label">Suite or unit (if any)</span>
        <input className="m-input" value={info.address.suite} onChange={(e) => setAddress("suite", e.target.value)} />
      </label>
      <div className="m-address-row">
        <label className="m-field">
          <span className="m-label">Town</span>
          <input className="m-input" value={info.address.city} onChange={(e) => setAddress("city", e.target.value)} />
        </label>
        <label className="m-field">
          <span className="m-label">State</span>
          <input className="m-input" value={info.address.state} maxLength={2} onChange={(e) => setAddress("state", e.target.value.toUpperCase())} />
        </label>
        <label className="m-field">
          <span className="m-label">ZIP</span>
          <input className="m-input" inputMode="numeric" value={info.address.zip} onChange={(e) => setAddress("zip", e.target.value)} />
        </label>
      </div>
      {addressChanged && (
        <div className="m-notice m-notice--warn">
          <p style={{ margin: "0 0 12px" }}>
            <strong>Changing the address is a big deal for Google.</strong> Google may ask to check the business again, sometimes by mailing
            a postcard with a code. Only change it if the restaurant&apos;s address really changed (fixing a small typo is fine too).
          </p>
          <button
            type="button"
            className={`m-choice ${addressConfirmed ? "m-choice--on" : ""}`}
            aria-pressed={addressConfirmed}
            onClick={() => setAddressConfirmed(!addressConfirmed)}
          >
            <span className="m-choice-mark" aria-hidden="true">
              {addressConfirmed ? "✓" : ""}
            </span>
            <span className="m-choice-label">Yes, the address really changed</span>
          </button>
        </div>
      )}

      <h2 className="m-subhead">Regular hours</h2>
      <ul className="m-hours-list">
        {WEEKDAYS.map((d) => {
          const h = info.hours[d.key];
          return (
            <li key={d.key} className="m-hours-row">
              <span className="m-hours-day">{d.label}</span>
              <div className="m-hours-toggle" role="group" aria-label={`${d.label}: open or closed`}>
                <button type="button" className={`m-day ${h.open ? "m-day--on" : ""}`} aria-pressed={h.open} onClick={() => setDay(d.key, { open: true })}>
                  Open
                </button>
                <button type="button" className={`m-day ${!h.open ? "m-day--on" : ""}`} aria-pressed={!h.open} onClick={() => setDay(d.key, { open: false })}>
                  Closed
                </button>
              </div>
              {h.open && (
                <div className="m-hours-times">
                  <TimeSelect label={`${d.label} opens at`} value={h.opensAt} onChange={(v) => setDay(d.key, { opensAt: v })} />
                  <span aria-hidden="true">to</span>
                  <TimeSelect label={`${d.label} closes at`} value={h.closesAt} onChange={(v) => setDay(d.key, { closesAt: v })} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <h2 className="m-subhead">Holidays and special days</h2>
      <p className="m-hint" style={{ marginTop: 0 }}>
        Days when you&apos;re closed or open different hours than usual. They come off the list by themselves once the day has passed.
      </p>
      {info.specialDays.length === 0 ? (
        <p className="m-notice">No special days coming up.</p>
      ) : (
        <ul className="m-hours-list">
          {info.specialDays.map((s, i) => (
            <li key={s.date} className={`m-hours-row ${s.date < today ? "m-hours-row--past" : ""}`}>
              <span className="m-hours-day">
                {dateLabel(s.date)}
                {s.label && <span className="m-hint"> — {s.label}</span>}
              </span>
              <div className="m-hours-toggle" role="group" aria-label={`${dateLabel(s.date)}: closed or special hours`}>
                <button type="button" className={`m-day ${s.closed ? "m-day--on" : ""}`} aria-pressed={s.closed} onClick={() => setSpecial(i, { closed: true })}>
                  Closed
                </button>
                <button type="button" className={`m-day ${!s.closed ? "m-day--on" : ""}`} aria-pressed={!s.closed} onClick={() => setSpecial(i, { closed: false })}>
                  Special hours
                </button>
              </div>
              {!s.closed && (
                <div className="m-hours-times">
                  <TimeSelect label="Opens at" value={s.opensAt} onChange={(v) => setSpecial(i, { opensAt: v })} />
                  <span aria-hidden="true">to</span>
                  <TimeSelect label="Closes at" value={s.closesAt} onChange={(v) => setSpecial(i, { closesAt: v })} />
                </div>
              )}
              <button
                type="button"
                className="m-textbtn"
                onClick={() => setInfo({ ...info, specialDays: info.specialDays.filter((_, j) => j !== i) })}
              >
                Remove this day
              </button>
            </li>
          ))}
        </ul>
      )}

      <fieldset className="m-fieldset m-add-day">
        <legend className="m-label">Add a day</legend>
        <label className="m-field">
          <span className="m-label">Date</span>
          <input className="m-input" type="date" min={today} value={newDay.date} onChange={(e) => setNewDay({ ...newDay, date: e.target.value })} />
        </label>
        <label className="m-field">
          <span className="m-label">What&apos;s the day? (optional)</span>
          <input className="m-input" placeholder="Example: Thanksgiving" value={newDay.label} onChange={(e) => setNewDay({ ...newDay, label: e.target.value })} />
        </label>
        <div className="m-hours-toggle" role="group" aria-label="Closed or special hours">
          <button type="button" className={`m-day ${newDay.closed ? "m-day--on" : ""}`} aria-pressed={newDay.closed} onClick={() => setNewDay({ ...newDay, closed: true })}>
            Closed all day
          </button>
          <button type="button" className={`m-day ${!newDay.closed ? "m-day--on" : ""}`} aria-pressed={!newDay.closed} onClick={() => setNewDay({ ...newDay, closed: false })}>
            Special hours
          </button>
        </div>
        {!newDay.closed && (
          <div className="m-hours-times" style={{ marginTop: 12 }}>
            <TimeSelect label="Opens at" value={newDay.opensAt} onChange={(v) => setNewDay({ ...newDay, opensAt: v })} />
            <span aria-hidden="true">to</span>
            <TimeSelect label="Closes at" value={newDay.closesAt} onChange={(v) => setNewDay({ ...newDay, closesAt: v })} />
          </div>
        )}
        <button type="button" className="m-btn m-btn--block" style={{ marginTop: 16 }} disabled={!newDay.date} onClick={addSpecialDay}>
          + Add this day to the list
        </button>
      </fieldset>

      {changed && problems.length > 0 && (
        <div className="m-notice m-notice--warn">
          {problems.map((p) => (
            <p key={p} style={{ margin: "4px 0" }}>
              {p}
            </p>
          ))}
        </div>
      )}
      {notice && (
        <div className={`m-notice ${notice.error ? "m-notice--error" : "m-notice--good"}`} role="status">
          {notice.text}
        </div>
      )}

      <div className="m-save-area">
        <button
          type="button"
          className="m-btn m-btn--primary m-btn--block m-btn--tall"
          onClick={save}
          disabled={busy || !changed || problems.length > 0 || (addressChanged && !addressConfirmed)}
        >
          {busy ? "Saving and sending…" : "Save and send everywhere"}
        </button>
        {changed && (
          <button type="button" className="m-textbtn m-textbtn--center" disabled={busy} onClick={() => setInfo(saved)}>
            Undo my changes
          </button>
        )}
      </div>
    </>
  );
}
