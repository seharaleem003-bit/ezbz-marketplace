import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { activateProviderIfEligible } from "@/lib/provider-activation";

// Checkr webhook shapes/signature scheme below are written from published
// docs, not verified live — see lib/checkr.ts for the same caveat. Expect
// field-name adjustments once CHECKR_WEBHOOK_SECRET and real event payloads
// are available to test against.
function verifyCheckrSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const CHECKR_STATUS_MAP: Record<string, "CLEAR" | "CONSIDER" | "FAILED"> = {
  clear: "CLEAR",
  consider: "CONSIDER",
  suspended: "FAILED",
};

export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.CHECKR_WEBHOOK_SECRET;
  const signature = request.headers.get("x-checkr-signature");

  if (!secret || !verifyCheckrSignature(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.type === "report.completed" || event.type === "report.updated") {
    const report = event.data?.object;
    const candidateId: string | undefined = report?.candidate_id;
    const status: string | undefined = report?.status;
    if (candidateId && status && status in CHECKR_STATUS_MAP) {
      const provider = await prisma.serviceProvider.findFirst({
        where: { backgroundCheckId: candidateId },
      });
      if (provider) {
        await prisma.serviceProvider.update({
          where: { id: provider.id },
          data: {
            backgroundCheckStatus: CHECKR_STATUS_MAP[status],
            backgroundCheckCompletedAt: new Date(),
          },
        });

        if (CHECKR_STATUS_MAP[status] === "CLEAR") {
          await activateProviderIfEligible(provider.id);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
