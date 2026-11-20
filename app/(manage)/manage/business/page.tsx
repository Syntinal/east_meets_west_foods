import { requireManageUser } from "@/lib/manage/auth";
import { Screen } from "@/components/manage/Screen";
import { SyncBoard } from "@/components/manage/business/SyncBoard";
import { BusinessInfoForm } from "@/components/manage/business/BusinessInfoForm";
import { businessToday } from "@/lib/businessDate";
import { addressLines, dateLabel, dayHoursLabel, specialDayHoursLabel, upcomingSpecialDays, WEEKDAYS, type BusinessInfo } from "@/lib/businessInfo";
import { getBusinessInfo } from "@/lib/businessInfoServer";
import { getSyncStatus, refreshGoogleStatus } from "@/lib/businessSync";
import { buildBoard } from "@/lib/businessSync/board";

export const dynamic = "force-dynamic";

// "Hours, address & phone": the one place to change them, plus a board
// showing every place they appear and whether each is up to date.

function copyText(info: BusinessInfo, today: string): string {
  const lines = [info.name, info.phone, ...addressLines(info.address), "", "Hours:"];
  for (const d of WEEKDAYS) lines.push(`${d.label}: ${dayHoursLabel(info.hours[d.key])}`);
  const special = upcomingSpecialDays(info, today);
  if (special.length) {
    lines.push("", "Holidays and special days:");
    for (const s of special) lines.push(`${dateLabel(s.date)}${s.label ? ` (${s.label})` : ""}: ${specialDayHoursLabel(s)}`);
  }
  return lines.join("\n");
}

export default async function BusinessInfoPage() {
  const { payload } = await requireManageUser();
  // Google takes a while to show a change; look again (at most once a
  // minute) whenever this screen is opened while one is waiting.
  await refreshGoogleStatus(payload);
  const today = businessToday();
  const [info, status] = await Promise.all([getBusinessInfo(payload), getSyncStatus(payload)]);
  const board = buildBoard(info, status, today);

  return (
    <Screen title="Hours, address & phone" back={{ href: "/manage", label: "Home" }}>
      <p className="m-intro">
        Change them once here. The website updates right away, and Google and Facebook get the change when they&apos;re connected.
      </p>
      <h2 style={{ marginTop: 0 }}>Where your info is shown</h2>
      <SyncBoard board={board} copyText={copyText(info, today)} />
      <h2 style={{ marginTop: 40 }}>Change something</h2>
      <BusinessInfoForm initial={info} today={today} />
    </Screen>
  );
}
