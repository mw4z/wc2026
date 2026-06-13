// Rank badge used on the leaderboard podium, tables, and the user record sheet.
export function RankMedallion({ place, size = "md" }: { place: number; size?: "sm" | "md" | "lg" }) {
  const tone: Record<number, string> = {
    1: "bg-gold-500/20 text-gold-300 ring-gold-500/50",
    2: "bg-white/10 text-slate-200 ring-white/25",
    3: "bg-amber-700/25 text-amber-300 ring-amber-600/40",
  };
  const dim =
    size === "lg" ? "h-12 w-12 text-xl" : size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-lg";
  return (
    <span
      className={`grid place-items-center rounded-full font-display font-extrabold tnum ring-2 ${
        tone[place] ?? "bg-white/10 text-slate-200 ring-white/20"
      } ${dim}`}
    >
      {place}
    </span>
  );
}
