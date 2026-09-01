"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/dal";
import { sendStaffInviteEmail } from "@/lib/email";

export type UserActionState = { error?: string; success?: string } | undefined;

// Long enough that an unused invite expires rather than lingering as a way in.
const INVITE_TTL_MS = 1000 * 60 * 60 * 48;

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  name: z.string().trim().max(120).optional(),
});

const hashToken = (raw: string) => crypto.createHash("sha256").update(raw).digest("hex");

/**
 * Invites a catalogue staff member.
 *
 * No password is set here and none is shown to the admin: the account is
 * created without one and the invitee sets their own through the existing
 * reset-token flow. That keeps passwords out of this screen, out of email
 * bodies, and out of whatever the admin would otherwise write them down in.
 */
export async function inviteStaffAction(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  await requireAdmin();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }
  const { email, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role === "ADMIN") {
    return { error: "That address already belongs to an admin — leave it alone." };
  }

  // An existing buyer is promoted rather than duplicated; email is unique, so
  // creating a second account would fail anyway.
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: { role: "STAFF" } })
    : await prisma.user.create({
        data: { email, name: name || null, role: "STAFF" },
      });

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await sendStaffInviteEmail(email, `${appUrl}/reset-password?token=${rawToken}`);
  } catch (error) {
    console.error("Staff invite email failed", error);
    return {
      error:
        "The account was created but the invite email didn't send. Ask them to use “Forgot password” to set one.",
    };
  }

  revalidatePath("/admin/users");
  return {
    success: existing
      ? `${email} is now catalogue staff — they've been emailed a link to set a password.`
      : `Invited ${email}. They've been emailed a link to set their password (valid 48 hours).`,
  };
}

/** Removes catalogue access, leaving the account as an ordinary buyer. */
export async function revokeStaffAction(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (session.user.id === userId) {
    throw new Error("You can't change your own access.");
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;
  if (target.role === "ADMIN") {
    throw new Error("Admins can't be demoted here.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role: "BUYER" } });
  revalidatePath("/admin/users");
}
