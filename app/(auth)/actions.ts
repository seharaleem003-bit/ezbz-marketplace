"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { loginSchema, signupSchema } from "@/lib/auth/schemas";
import { mergeGuestCartIntoUser } from "@/lib/cart";

export type LoginActionState = { error?: string } | undefined;

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  const signedInUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (signedInUser) {
    await mergeGuestCartIntoUser(signedInUser.id);
  }

  const callbackUrl = formData.get("callbackUrl");
  if (typeof callbackUrl === "string" && callbackUrl) {
    redirect(callbackUrl);
  }

  // Staff and admins work in the admin panel, so send them there instead of
  // the storefront — otherwise a new staff member signs in, lands on the shop,
  // and has no idea the panel exists.
  if (signedInUser?.role === "STAFF") redirect("/admin/listings");
  if (signedInUser?.role === "ADMIN") redirect("/admin");

  redirect("/");
}

export type SignupActionState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

function generateReferralCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function uniqueReferralCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  // Astronomically unlikely with 8 hex chars, but fall back to a longer code.
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    referralCode: formData.get("referralCode") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, referralCode } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  let referredByUserId: string | undefined;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode } });
    referredByUserId = referrer?.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const ownReferralCode = await uniqueReferralCode();

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      referralCode: ownReferralCode,
      referredByUserId,
    },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      // Account exists but auto sign-in failed — send them to log in by hand.
      redirect("/login");
    }
    throw error;
  }

  await mergeGuestCartIntoUser(newUser.id);

  redirect("/");
}
