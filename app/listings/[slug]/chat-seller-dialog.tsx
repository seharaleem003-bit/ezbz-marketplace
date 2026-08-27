"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";

import { sendListingMessageAction, type ChatState } from "./chat-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentPicker } from "@/components/attachment-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ChatLabels {
  trigger: string;
  title: string;
  blurb: string;
  placeholder: string;
  send: string;
  sending: string;
  sentTitle: string;
  sentBlurb: string;
  viewMessages: string;
  signInPrompt: string;
  signIn: string;
}

export function ChatSellerDialog({
  listingId,
  sellerName,
  quickMessages,
  labels,
}: {
  listingId: string;
  sellerName: string;
  quickMessages: readonly string[];
  labels: ChatLabels;
}) {
  const [state, action, pending] = useActionState<ChatState, FormData>(
    sendListingMessageAction,
    undefined
  );
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Quick replies fill the box rather than sending immediately, so the buyer
  // can still edit before committing — matches how Marketplace behaves.
  function useQuickMessage(text: string) {
    if (!textareaRef.current) return;
    textareaRef.current.value = text;
    textareaRef.current.focus();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="flex-1 border-gold-500 font-semibold text-gold-600 hover:bg-gold-500/10"
          />
        }
      >
        <MessageCircle />
        {labels.trigger}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {state?.success ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-8 text-gold-500" />
            <div>
              <p className="font-medium">{labels.sentTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{labels.sentBlurb}</p>
            </div>
            <Button variant="outline" render={<Link href="/account/messages" />}>
              {labels.viewMessages}
            </Button>
          </div>
        ) : state?.requiresLogin ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MessageCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{labels.signInPrompt}</p>
            <Button render={<Link href="/login" />}>{labels.signIn}</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{labels.title.replace("{seller}", sellerName)}</DialogTitle>
              <DialogDescription>{labels.blurb}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              {quickMessages.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => useQuickMessage(text)}
                  className="rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-gold-500 hover:bg-gold-500/10"
                >
                  {text}
                </button>
              ))}
            </div>

            <form action={action} className="flex flex-col gap-3">
              <input type="hidden" name="listingId" value={listingId} />
              <Textarea
                ref={textareaRef}
                name="body"
                rows={4}
                placeholder={labels.placeholder}
              />

              {/* Not `required` on the textarea any more: a photo of the item
                  is a complete message on its own, and the action rejects a
                  submission that has neither text nor files. */}
              <AttachmentPicker />
              {state?.error ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending}>
                <Send />
                {pending ? labels.sending : labels.send}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
