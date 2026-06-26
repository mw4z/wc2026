import { getUI } from "@/lib/locale";
import { PageLoader } from "@/components/PageLoader";

export default async function TournamentLoading() {
  const UI = await getUI();
  return <PageLoader title={UI.appName} subtitle={UI.loadingApp} cards={2} />;
}
