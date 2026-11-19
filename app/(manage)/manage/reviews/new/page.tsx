import { requireManageUser } from "@/lib/manage/auth";
import { GOOGLE_MAPS_URL } from "@/components/admin/GoogleReviewsLink";
import { Screen } from "@/components/manage/Screen";
import { ReviewEditor } from "@/components/manage/reviews/ReviewEditor";

export const dynamic = "force-dynamic";

export default async function NewReviewPage() {
  await requireManageUser();
  return (
    <Screen back={{ href: "/manage/reviews", label: "Reviews" }}>
      <ReviewEditor review={null} googleUrl={GOOGLE_MAPS_URL} />
    </Screen>
  );
}
