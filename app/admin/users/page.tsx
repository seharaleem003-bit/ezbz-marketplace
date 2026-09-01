import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { InviteForm } from "./invite-form";
import { RevokeButton } from "./revoke-button";

export const metadata: Metadata = {
  title: "Users",
};

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminUsersPage() {
  // Admin-only: staff must not be able to grant themselves more access.
  const session = await requireAdmin();

  const team = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "STAFF"] } },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Users</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Catalogue staff can add and edit listings, import spreadsheets, and preview their work
          before it goes live. They cannot publish, and cannot see orders, customers, payouts or
          this page.
        </p>
      </div>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="mb-4 font-heading text-lg font-semibold">Add a user</h2>
        <InviteForm />
        <p className="mt-4 text-xs text-muted-foreground">
          They&apos;re emailed a link to set their own password — you never see or choose it, and
          the link expires after 48 hours.
        </p>
      </section>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="mb-3 font-heading text-lg font-semibold">Team</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Added</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {team.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{u.name ?? "—"}</td>
                  <td className="max-w-[16rem] truncate py-2 pr-3 text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        u.role === "ADMIN"
                          ? "bg-navy-900 text-white"
                          : "bg-gold-500 text-navy-900"
                      }`}
                    >
                      {u.role === "ADMIN" ? "Admin" : "Catalogue staff"}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {u.passwordHash ? "Active" : "Invite pending"}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {dateFmt.format(u.createdAt)}
                  </td>
                  <td className="py-2 text-right">
                    {u.role === "STAFF" && u.id !== session.user.id ? (
                      <RevokeButton userId={u.id} email={u.email} />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
