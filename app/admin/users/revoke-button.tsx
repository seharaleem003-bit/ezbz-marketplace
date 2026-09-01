"use client";

import { useTransition } from "react";

import { revokeStaffAction } from "./actions";

export function RevokeButton({ userId, email }: { userId: string; email: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        // Removing someone's access mid-session is worth a deliberate click.
        if (!confirm(`Remove catalogue access for ${email}?`)) return;
        start(async () => {
          await revokeStaffAction(userId);
        });
      }}
      className="text-sm text-destructive hover:underline disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove access"}
    </button>
  );
}
