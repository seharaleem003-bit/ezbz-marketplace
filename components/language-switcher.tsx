"use client";

import { useTransition } from "react";
import { Check, Globe } from "lucide-react";

import { setLocaleAction } from "@/app/locale-actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={label} disabled={isPending}>
            <Globe />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => startTransition(() => setLocaleAction(locale))}
          >
            {locale === current ? <Check /> : <span className="size-4" />}
            {LOCALE_LABELS[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
