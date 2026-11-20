import { dateLabel, dayHoursLabel, specialDayHoursLabel, upcomingSpecialDays, WEEKDAYS, type BusinessInfo } from "@/lib/businessInfo";

export type HoursContext = { info: BusinessInfo; today: string };

// The Pages "Store Hours (automatic)" block. Same markup/classes as the
// hand-typed hours table in RichTextWithHours.tsx, so both look identical.
export function StoreHoursTable({ hours, showSpecialDays }: { hours: HoursContext; showSpecialDays: boolean }) {
  const special = showSpecialDays ? upcomingSpecialDays(hours.info, hours.today) : [];
  return (
    <>
      <table className="hours-table">
        <tbody>
          {WEEKDAYS.map((d) => {
            const h = hours.info.hours[d.key];
            return (
              <tr key={d.key} className={h.open ? undefined : "is-closed"}>
                <th scope="row">{d.label}</th>
                <td>{dayHoursLabel(h)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {special.length > 0 && (
        <>
          <h3 className="hours-heading-sub">Holidays &amp; special days</h3>
          <table className="hours-table">
            <tbody>
              {special.map((s) => (
                <tr key={s.date} className={s.closed ? "is-closed" : undefined}>
                  <th scope="row">
                    {dateLabel(s.date)}
                    {s.label && (
                      <>
                        <br />
                        <span style={{ fontWeight: 400 }}>{s.label}</span>
                      </>
                    )}
                  </th>
                  <td>{specialDayHoursLabel(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
