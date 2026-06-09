// Small inline loading spinner. Inherits the current text color (border-current),
// so it matches whatever button/label it sits in. Tailwind's animate-spin.
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="loading"
      className={`inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.2em] ${className}`}
    />
  );
}
