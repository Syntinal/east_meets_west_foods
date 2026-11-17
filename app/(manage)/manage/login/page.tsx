import { redirect } from "next/navigation";
import { getManageSession } from "@/lib/manage/auth";
import { HELP_CONTACT } from "@/lib/manage/help";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function ManageLoginPage() {
  const { user } = await getManageSession();
  if (user) redirect("/manage");

  return (
    <main className="m-main" style={{ maxWidth: 520 }}>
      <h1>Sign in</h1>
      <p className="m-intro">Use the same email and password as before.</p>
      <LoginForm helpName={HELP_CONTACT.name} />
    </main>
  );
}
