import { getUI } from "@/lib/locale";
import { PageLoader } from "@/components/PageLoader";

// Dedicated loading boundary for a group and its sub-pages (predictions, members,
// leaderboard, scoring) so entering a group shows the branded loader instantly.
export default async function GroupLoading() {
  const UI = await getUI();
  return <PageLoader title={UI.appName} subtitle={UI.loadingApp} cards={2} />;
}
