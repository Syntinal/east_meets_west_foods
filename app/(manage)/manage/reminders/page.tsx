import { requireManageUser } from "@/lib/manage/auth";
import { Screen } from "@/components/manage/Screen";
import { ReminderSetup } from "@/components/manage/ReminderSetup";
import { ReminderScheduleForm } from "@/components/manage/ReminderScheduleForm";

export const dynamic = "force-dynamic";

// Turn reminders on for this phone, and choose how often they come. The
// schedule is the shared globals/ReminderSettings.ts (also editable in
// /admin, which additionally has the message wording).
export default async function RemindersPage() {
  const { payload, user } = await requireManageUser();
  const settings = (await payload.findGlobal({ slug: "reminder-settings", overrideAccess: false, user, depth: 0 })) as unknown as {
    enabled?: boolean;
    checkDays?: string[];
    minHoursSinceLastPost?: number;
  };

  return (
    <Screen title="Reminders" back={{ href: "/manage", label: "Home" }}>
      <p className="m-intro">Get a reminder on your phone when it&apos;s been a while since your last post.</p>
      <h2 style={{ marginTop: 0 }}>On this phone</h2>
      <ReminderSetup />
      <h2>How often</h2>
      <ReminderScheduleForm
        initial={{
          enabled: settings.enabled !== false,
          checkDays: settings.checkDays ?? [],
          minHoursSinceLastPost: settings.minHoursSinceLastPost ?? 48,
        }}
      />
    </Screen>
  );
}
