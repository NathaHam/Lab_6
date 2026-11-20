"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="text-3xl" aria-hidden>
        ⚠️
      </div>
      <h1 className="mt-2 text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page couldn&apos;t load. If this keeps happening, check that the database is set up
        (<code className="rounded bg-slate-100 px-1">npm run db:setup</code> in <code className="rounded bg-slate-100 px-1">prototype/</code>).
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" className="btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
