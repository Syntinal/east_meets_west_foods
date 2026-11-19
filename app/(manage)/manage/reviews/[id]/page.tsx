import { notFound } from "next/navigation";
import { requireManageUser } from "@/lib/manage/auth";
import { getReview } from "@/lib/manage/reviewOps";
import { GOOGLE_MAPS_URL } from "@/components/admin/GoogleReviewsLink";
import { Screen } from "@/components/manage/Screen";
import { ReviewEditor } from "@/components/manage/reviews/ReviewEditor";

export const dynamic = "force-dynamic";

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { payload, user } = await requireManageUser();
  const review = await getReview({ payload, user }, id);
  if (!review) notFound();
  return (
    <Screen back={{ href: "/manage/reviews", label: "Reviews" }}>
      <ReviewEditor review={review} googleUrl={GOOGLE_MAPS_URL} />
    </Screen>
  );
}
