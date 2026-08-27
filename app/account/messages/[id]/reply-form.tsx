"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";

import { replyToConversationAction, type ChatState } from "@/app/listings/[slug]/chat-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentPicker } from "@/components/attachment-picker";

export function ReplyForm({ conversationId }: { conversationId: string }) {
  const [state, action, pending] = useActionState<ChatState, FormData>(
    replyToConversationAction.bind(null, conversationId),
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once a reply lands, so the next message starts empty.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <Textarea name="body" rows={3} placeholder="Write a reply…" />
      <AttachmentPicker />
      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-end">
        <Send />
        {pending ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
