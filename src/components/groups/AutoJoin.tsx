"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUI } from "@/components/I18nProvider";

// Joins the group from an invite link automatically (no code entry). Runs on
// mount (client only, so it isn't triggered by RSC prefetch). joinGroupByCode is
// idempotent, so following the link again just lands you in the group.
export function AutoJoin({ code }: { code: string }) {
  const UI = useUI();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || UI.groupNotFound);
          return;
        }
        router.replace(`/groups/${data.groupId}`);
        router.refresh();
      } catch {
        setError(UI.connError);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="card card-accent p-8 text-center">
      {error ? (
        <>
          <p className="text-amber-200">{error}</p>
          <Link href="/groups" className="btn-ghost mt-4 inline-flex">
            {UI.groups}
          </Link>
        </>
      ) : (
        <p className="text-slate-300">{UI.joining}</p>
      )}
    </div>
  );
}
