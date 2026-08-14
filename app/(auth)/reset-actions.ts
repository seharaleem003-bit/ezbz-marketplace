"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/auth/schemas";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Only the hash is persisted — see the PasswordResetToken schema comment.
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export type ForgotPasswordState = { error?: string; sent?: boolean } | undefined;

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter a valid email address." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always report success, even when no account matches. Revealing which
  // addresses are registered would turn this form into an account-enumeration
  // oracle for anyone probing it.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Any earlier outstanding links stop working the moment a new one is
    // requested, so a forwarded or leaked older email can't still be redeemed.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await sendPasswordResetEmail(user.email, `${appUrl}/reset-password?token=${rawToken}`);
  }

  return { sent: true };
}

export type ResetPasswordState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; done?: boolean }
  | undefined;

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });

  if (!record) {
    return { error: "This reset link isn't valid. Request a new one below." };
  }

  // Distinguish the three failure modes — telling someone their link
  // "expired" when it was actually superseded sends them hunting for a
  // timeout that never happened. The most common case by far is having two
  // reset emails open and clicking the older one.
  if (record.usedAt) {
    const newer = await prisma.passwordResetToken.findFirst({
      where: {
        userId: record.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gt: record.createdAt },
      },
    });

    return {
      error: newer
        ? "This link was replaced by a newer one. Open the most recent password reset email instead."
        : "This link has already been used. Request a new one below.",
    };
  }

  if (record.expiresAt < new Date()) {
    return { error: "This reset link has expired. Request a new one below." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { done: true };
}
