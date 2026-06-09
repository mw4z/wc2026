import { getUI } from "@/lib/locale";
import { PageLoader } from "@/components/PageLoader";

// Shown instantly (as the Suspense fallback) for any tab in the app shell while
// its server page loads — so tab presses respond in milliseconds. The AppShell
// layout (header + bottom tab bar) stays mounted; only this content area swaps.
export default async function AppLoading() {
  const UI = await getUI();
  return <PageLoader title={UI.appName} subtitle={UI.loadingApp} />;
}
