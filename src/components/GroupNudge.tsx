"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UI } from "@/lib/constants";
import { UsersIcon, PlusIcon } from "./icons";

const DISMISS_KEY = "wc26_group_nudge_dismissed";

// Shown once per session when the signed-in user belongs to no group: a gentle
// invitation to join or create one. Sign-in itself never requires a group.
export function GroupNudge({ hasGroup }: { hasGroup: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (hasGroup) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    setShow(true);
  }, [hasGroup]);

  if (!show) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card edge-accent reveal w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-accent-500/15 text-3xl text-accent-400 ring-1 ring-accent-500/25">
          <UsersIcon />
        </span>
        <h2 className="text-lg font-bold text-white">نافِس زملاءك في مجموعة</h2>
        <p className="mt-2 text-sm text-slate-400">
          أنشئ مجموعة خاصة أو انضم بكود لمتابعة ترتيبك بين زملائك على لوحة خاصة بكم.
          توقعاتك ونقاطك تبقى كما هي — المجموعة مجرد لوحة تنافس إضافية.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Link href="/groups/new" onClick={dismiss} className="btn-primary w-full">
            <PlusIcon className="text-base" />
            {UI.createGroup}
          </Link>
          <Link href="/groups/join" onClick={dismiss} className="btn-ghost w-full">
            {UI.joinGroup}
          </Link>
          <button type="button" onClick={dismiss} className="mt-1 text-sm text-slate-400 hover:text-slate-200">
            لاحقًا
          </button>
        </div>
      </div>
    </div>
  );
}
