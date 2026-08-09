"use client";

import { useTransition } from "react";

import { resolveTicketAction } from "./actions";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

export interface TicketRowData {
  id: string;
  ticketNumber: string;
  email: string;
  message: string;
  status: string;
  createdAt: Date;
}

export function TicketRow({ ticket }: { ticket: TicketRowData }) {
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{ticket.ticketNumber}</TableCell>
      <TableCell>{ticket.email}</TableCell>
      <TableCell className="max-w-96 whitespace-normal">{ticket.message}</TableCell>
      <TableCell>{ticket.status}</TableCell>
      <TableCell>{ticket.createdAt.toLocaleDateString()}</TableCell>
      <TableCell>
        {ticket.status !== "RESOLVED" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => resolveTicketAction(ticket.id))}
          >
            Mark resolved
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
