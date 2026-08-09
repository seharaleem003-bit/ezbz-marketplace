"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Mail, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { loginAction, type LoginActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="white" aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.04 12.27c0-.82-.07-1.6-.2-2.36H12v4.47h6.19a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2.01 3.43-4.96 3.43-8.49"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.1 0 5.7-1.02 7.6-2.77l-3.71-2.9c-1.03.7-2.35 1.1-3.89 1.1-2.99 0-5.52-2.02-6.43-4.73H1.74v2.98A11.5 11.5 0 0 0 12 23.5"
      />
      <path
        fill="#FBBC05"
        d="M5.57 14.2a6.9 6.9 0 0 1 0-4.4V6.82H1.74a11.5 11.5 0 0 0 0 10.36z"
      />
      <path
        fill="#EA4335"
        d="M12 5.07c1.69 0 3.2.58 4.4 1.72l3.28-3.28C17.7 1.66 15.1.5 12 .5A11.5 11.5 0 0 0 1.74 6.82L5.57 9.8C6.48 7.09 9.01 5.07 12 5.07"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M16.36 1.43c0 1.14-.42 2.1-1.25 2.9-.84.8-1.85 1.26-3.02 1.16a3.4 3.4 0 0 1 .01-.36c.05-1.1.53-2.06 1.32-2.8.79-.75 1.85-1.26 2.94-1.33.02.14.02.28 0 .43M20.4 17.66c-.45 1.03-.98 1.98-1.6 2.86-.86 1.2-1.56 2.03-2.1 2.5-.83.75-1.72 1.14-2.67 1.16-.68.02-1.5-.19-2.44-.63-.94-.44-1.8-.65-2.59-.65-.83 0-1.72.21-2.68.65-.96.44-1.73.67-2.32.69-.91.04-1.83-.36-2.75-1.2-.59-.5-1.32-1.37-2.2-2.6C.16 18.6-.5 16.15.31 13.9c.62-1.7 1.6-3 2.94-3.9 1.2-.8 2.42-1.15 3.66-1.13.72.02 1.62.24 2.7.68.68.28 1.19.42 1.53.42.26 0 .81-.16 1.65-.49 1.02-.4 1.87-.56 2.57-.5 1.9.15 3.32.9 4.27 2.26-1.7 1.03-2.54 2.47-2.53 4.31.02 1.44.55 2.63 1.57 3.58.47.44.98.78 1.53 1.02-.12.36-.25.7-.4 1.02" />
    </svg>
  );
}

function EzbzLogo() {
  return (
    <p className="text-4xl font-heading font-bold tracking-tight text-navy-900">
      EZ<span className="text-gold-500">BZ</span>
    </p>
  );
}

function ProvidersStep({ onEmail }: { onEmail: () => void }) {
  const notConfigured = (provider: string) =>
    toast.info(`${provider} sign-in isn't set up yet — use email for now.`);

  return (
    <div className="flex flex-col items-center gap-6 px-2 pb-2 pt-4">
      <EzbzLogo />

      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => notConfigured("Facebook")}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#1877F2] text-sm font-semibold text-white hover:brightness-105"
        >
          <FacebookIcon />
          Continue with Facebook
        </button>
        <button
          type="button"
          onClick={() => notConfigured("Google")}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#EFF3FC] text-sm font-semibold text-navy-900 ring-1 ring-inset ring-border hover:brightness-95"
        >
          <GoogleIcon />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => notConfigured("Apple")}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-navy-900 text-sm font-semibold text-navy-900 hover:bg-muted"
        >
          <AppleIcon />
          Continue with Apple
        </button>
        <button
          type="button"
          onClick={onEmail}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-gold-500 text-sm font-semibold text-gold-600 hover:bg-gold-500/10"
        >
          <Mail className="size-5" />
          Continue with email
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to EZBZ&apos;s{" "}
        <Link href="/terms" className="font-medium underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link href="/privacy" className="font-medium underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function EmailStep({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState<LoginActionState, FormData>(
    loginAction,
    undefined
  );

  return (
    <div className="flex flex-col gap-4 px-2 pb-2 pt-1">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div className="text-center">
        <h2 className="text-lg font-heading font-semibold">Log in with email</h2>
        <p className="mt-1 text-sm text-muted-foreground">Welcome back to EZBZ.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-dialog-email">Email</Label>
          <Input id="auth-dialog-email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="auth-dialog-password">Password</Label>
          <Input
            id="auth-dialog-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        {state?.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Log in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to EZBZ?{" "}
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function AuthDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"providers" | "email">("providers");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setStep("providers");
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="rounded-full" />}
      >
        Log in
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-xl">Sign up / Log in</DialogTitle>
          <DialogClose
            render={
              <button type="button" className="text-sm text-muted-foreground hover:text-foreground" />
            }
          >
            Cancel
          </DialogClose>
        </div>

        {step === "providers" ? (
          <ProvidersStep onEmail={() => setStep("email")} />
        ) : (
          <EmailStep onBack={() => setStep("providers")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
