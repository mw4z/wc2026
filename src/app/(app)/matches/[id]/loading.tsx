import { getUI } from "@/lib/locale";
import { PageLoader } from "@/components/PageLoader";

// Branded loader shown the instant a match card is tapped, while the detail page
// (result, prediction distribution, everyone's picks) streams in.
export default async function MatchDetailLoading() {
  const UI = await getUI();
  return <PageLoader title={UI.appName} subtitle={UI.loadingApp} cards={1} />;
}
