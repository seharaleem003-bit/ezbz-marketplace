"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { resetPasswordAction, type ResetPasswordState } from "../reset-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPasswordAction,
    undefined
  );

  if (state?.done) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Password updated</CardTitle>
          <CardDescription>You can now sign in with your new password.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <CheckCircle2 className="size-8 text-gold-500" />
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t-0 bg-transparent">
          <Button render={<Link href="/login" />} className="w-full">
            Sign in
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Reset link is invalid</CardTitle>
          <CardDescription>
            This link is missing its token. Request a fresh reset email to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t-0 bg-transparent">
          <Button render={<Link href="/forgot-password" />} className="w-full">
            Request a new link
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Pick something at least 8 characters long.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
            {state?.fieldErrors?.password ? (
              <p className="text-sm text-destructive">{state.fieldErrors.password[0]}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
            {state?.fieldErrors?.confirmPassword ? (
              <p className="text-sm text-destructive">{state.fieldErrors.confirmPassword[0]}</p>
            ) : null}
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t-0 bg-transparent">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Updating…" : "Update password"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Request a new link
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
