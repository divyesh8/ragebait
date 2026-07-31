import { notFound } from "next/navigation";
import { requireCreatorFromCookies } from "@/lib/creator";
import CreatorCommandCenter from "@/components/creator/CreatorCommandCenter";

export const dynamic = "force-dynamic";

export default async function CreatorPage() {
  const creator = await requireCreatorFromCookies();

  if (!creator) {
    notFound();
  }

  return <CreatorCommandCenter />;
}
