"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUI } from "@/components/I18nProvider";
import { ArrowIcon, UserIcon, PlusIcon } from "@/components/icons";

export default function LoginChoicePage() {
  return (
    <Suspense fallback={null}>
      <Choice />
    </Suspense>
  );
}

function Choice() {
  const UI = useUI();
  const params = useSearchParams();
  const next = params.get("next");
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="card card-accent space-y-3 p-6">
      <p className="mb-1 text-center text-sm font-semibold text-slate-300">{UI.haveAccountQuestion}</p>

      <Link href={`/login/signin${qs}`} className="btn-primary w-full justify-between">
        <span className="inline-flex items-center gap-2">
          <UserIcon className="text-base" />
          {UI.iHaveAccount}
        </span>
        <ArrowIcon className="text-base ltr:-scale-x-100" />
      </Link>

      <Link href={`/login/signup${qs}`} className="btn-ghost w-full justify-between">
        <span className="inline-flex items-center gap-2">
          <PlusIcon className="text-base" />
          {UI.createNewAccount}
        </span>
        <ArrowIcon className="text-base ltr:-scale-x-100" />
      </Link>
    </div>
  );
}
