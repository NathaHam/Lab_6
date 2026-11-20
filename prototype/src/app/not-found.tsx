import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
      <div className="text-3xl" aria-hidden>
        🔍
      </div>
      <h1 className="mt-2 text-xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        This page doesn&apos;t exist, or the current demo user isn&apos;t a member of the group it belongs to.
      </p>
      <Link href="/" className="btn-primary mt-5">
        Back to dashboard
      </Link>
    </div>
  );
}
