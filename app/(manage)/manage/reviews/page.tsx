import { requireManageUser } from "@/lib/manage/auth";
import { listReviews } from "@/lib/manage/reviewOps";
import { Screen } from "@/components/manage/Screen";
import { ReviewList } from "@/components/manage/reviews/ReviewList";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const { payload, user } = await requireManageUser();
  const reviews = await listReviews({ payload, user });
  return (
    <Screen
      title="Customer reviews"
      intro="The good reviews shown on your website."
      back={{ href: "/manage", label: "Home" }}
    >
      <ReviewList reviews={reviews} />
    </Screen>
  );
}
