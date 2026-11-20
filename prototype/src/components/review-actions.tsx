"use client";

import { useActionState, useState } from "react";
import { reviewExpense, type FormState } from "@/lib/actions";
import { SubmitButton } from "./submit-button";

export function ReviewActions({
  expenseId,
  returnTo,
  compact = false,
}: {
  expenseId: string;
  returnTo: string;
  compact?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(reviewExpense, {});
  const [rejecting, setRejecting] = useState(false);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="expenseId" value={expenseId} />
      <input type="hidden" name="returnTo" value={returnTo} />

      {rejecting && (
        <div>
          <label htmlFor={`note-${expenseId}`} className="label">
            Reason for rejecting <span className="text-rose-600">*</span>
          </label>
          <textarea
            id={`note-${expenseId}`}
            name="note"
            rows={2}
            maxLength={280}
            required
            autoFocus
            className="input"
            placeholder="e.g. Duplicate of an earlier expense"
            aria-invalid={state.fieldErrors?.note ? true : undefined}
          />
        </div>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {state.error}
        </p>
      )}

      <div className={`flex flex-wrap gap-2 ${compact ? "" : "pt-1"}`}>
        {rejecting ? (
          <>
            <SubmitButton name="decision" value="REJECTED" className="btn-danger" pendingLabel="Rejecting…">
              Confirm reject
            </SubmitButton>
            <button type="button" className="btn-ghost" onClick={() => setRejecting(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <SubmitButton name="decision" value="APPROVED" className="btn-primary" pendingLabel="Approving…">
              ✓ Approve
            </SubmitButton>
            <button type="button" className="btn-secondary" onClick={() => setRejecting(true)}>
              Reject…
            </button>
          </>
        )}
      </div>
    </form>
  );
}
