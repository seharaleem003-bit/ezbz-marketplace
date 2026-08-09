"use server";

import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { supportTicketSchema } from "@/lib/validation/support";

export type SupportTicketState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined>; ticketNumber?: string }
  | undefined;

function generateTicketNumber() {
  return `TCK-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createSupportTicketAction(
  _prevState: SupportTicketState,
  formData: FormData
): Promise<SupportTicketState> {
  const parsed = supportTicketSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const session = await auth();

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      email: parsed.data.email,
      message: parsed.data.message,
      userId: session?.user?.id,
    },
  });

  return { ticketNumber: ticket.ticketNumber };
}
