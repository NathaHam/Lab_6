"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
  name,
  value,
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending, data } = useFormStatus();
  // When several submit buttons share a form, only show the spinner on the one pressed.
  const isThisOne = pending && (!name || data?.get(name) === value);
  return (
    <button type="submit" name={name} value={value} className={className} disabled={pending || disabled} aria-disabled={pending || disabled}>
      {isThisOne && <Spinner />}
      {isThisOne && pendingLabel ? pendingLabel : children}
    </button>
  );
}
