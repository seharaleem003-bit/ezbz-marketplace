"use client";

import { useTransition } from "react";

import { markNeedDeliveredAction } from "./actions";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/format";

export interface NeedRowData {
  id: string;
  title: string;
  status: string;
  raisedCents: number;
  goalCents: number;
}

export function NeedRow({ need }: { need: NeedRowData }) {
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{need.title}</TableCell>
      <TableCell>{need.status}</TableCell>
      <TableCell>
        {formatCents(need.raisedCents)} / {formatCents(need.goalCents)}
      </TableCell>
      <TableCell>
        {need.status === "FULFILLED" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => markNeedDeliveredAction(need.id))}
          >
            Mark delivered
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
