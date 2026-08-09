import "server-only";
import { Resend } from "resend";

import { formatCents } from "@/lib/format";
import type { Order, OrderItem } from "@prisma/client";

let resendClient: Resend | null = null;

// Lazy singleton, same reasoning as lib/stripe.ts's getStripe(): constructing
// eagerly at module load throws when RESEND_API_KEY is unset, which breaks
// `next build`'s page-data-collection pass even for routes that never send mail.
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "EZBZ Marketplace <onboarding@resend.dev>";
}

// Every send is best-effort: a failed email should never fail the checkout
// or refund flow that triggered it. Callers fire-and-forget; errors are
// logged for manual follow-up rather than thrown.
async function sendSafely(params: Parameters<Resend["emails"]["send"]>[0]) {
  try {
    const result = await getResend().emails.send(params);
    if (result.error) {
      console.error("Resend send failed", result.error);
    }
  } catch (error) {
    console.error("Resend send threw", error);
  }
}

function layout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
      <div style="padding: 24px 0 8px; font-size: 20px; font-weight: 700;">
        EZ<span style="color: #ca8a04;">BZ</span>
      </div>
      <h1 style="font-size: 18px; margin: 8px 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #64748b;">EZBZ Marketplace</p>
    </div>
  `;
}

function itemsTable(items: OrderItem[]): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 6px 0; font-size: 14px;">${item.titleAtPurchase} &times; ${item.quantity}</td>
          <td style="padding: 6px 0; font-size: 14px; text-align: right;">${formatCents(item.priceCentsAtPurchase * item.quantity)}</td>
        </tr>`
    )
    .join("");
  return `<table style="width: 100%; border-collapse: collapse;">${rows}</table>`;
}

// A single checkout can produce multiple Order rows (one per merchant — see
// the schema comment on Order.sellerId), but the buyer paid once. Mirror the
// checkout success page's UX and send one combined email per checkout
// rather than one per merchant sub-order.
export async function sendOrderConfirmationEmail(
  orders: (Order & { items: OrderItem[] })[],
  recipientEmail: string
) {
  if (orders.length === 0) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const grandTotalCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const primary = orders[0];

  const orderSections = orders
    .map(
      (order) => `
        <div style="margin-top: 16px;">
          <p style="font-size: 13px; font-weight: 600; margin-bottom: 4px;">${order.orderNumber}</p>
          ${itemsTable(order.items)}
        </div>`
    )
    .join("");

  const html = layout(
    "Order confirmed",
    `
      <p style="font-size: 14px;">Thanks for your order! We're getting things ready.</p>
      ${orderSections}
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; margin-top: 12px;">
        <tr>
          <td style="padding-top: 8px; font-size: 14px; font-weight: 600;">Total</td>
          <td style="padding-top: 8px; font-size: 14px; font-weight: 600; text-align: right;">${formatCents(grandTotalCents)}</td>
        </tr>
      </table>
      <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
        Shipping to ${primary.shippingName}, ${primary.shippingLine1}, ${primary.shippingCity}, ${primary.shippingState} ${primary.shippingPostal}
      </p>
      <a href="${appUrl}/account/orders" style="display: inline-block; margin-top: 16px; padding: 10px 16px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">View your orders</a>
    `
  );

  const subject =
    orders.length > 1
      ? `Order confirmed — ${orders.length} orders`
      : `Order confirmed — ${primary.orderNumber}`;

  await sendSafely({ from: fromAddress(), to: recipientEmail, subject, html });
}

export async function sendRefundReceiptEmail(
  order: Order,
  recipientEmail: string,
  amountCents: number,
  isFullRefund: boolean
) {
  const html = layout(
    isFullRefund ? "Order refunded" : "Partial refund issued",
    `
      <p style="font-size: 14px;">
        We've refunded <strong>${formatCents(amountCents)}</strong> for order <strong>${order.orderNumber}</strong>.
        It should appear on your original payment method within 5–10 business days.
      </p>
    `
  );

  await sendSafely({
    from: fromAddress(),
    to: recipientEmail,
    subject: `Refund issued — ${order.orderNumber}`,
    html,
  });
}
