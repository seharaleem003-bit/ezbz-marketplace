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

/**
 * Tells the merchant a sale came in, so nothing sits unshipped waiting for
 * someone to happen to open the dashboard. Sent per order — a multi-seller
 * checkout notifies each seller about their own order only.
 */
export async function sendNewOrderNotificationEmail(
  order: Order & { items: OrderItem[] },
  recipientEmail: string,
  { isPlatformOrder }: { isPlatformOrder: boolean }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dashboardPath = isPlatformOrder ? "/admin/orders" : "/sell/orders";

  const html = layout(
    "You made a sale",
    `
      <p style="font-size: 14px;">
        Order <strong>${order.orderNumber}</strong> has been paid and is ready to fulfill.
      </p>
      ${itemsTable(order.items)}
      <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #e2e8f0; margin-top: 12px;">
        <tr>
          <td style="padding-top: 8px; font-size: 14px; font-weight: 600;">Order total</td>
          <td style="padding-top: 8px; font-size: 14px; font-weight: 600; text-align: right;">${formatCents(order.totalCents)}</td>
        </tr>
        <tr>
          <td style="font-size: 13px; color: #64748b;">Your payout</td>
          <td style="font-size: 13px; color: #64748b; text-align: right;">${formatCents(order.merchantPayoutCents)}</td>
        </tr>
      </table>
      <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
        Ship to ${order.shippingName}, ${order.shippingLine1}, ${order.shippingCity}, ${order.shippingState} ${order.shippingPostal}
      </p>
      <a href="${appUrl}${dashboardPath}" style="display: inline-block; margin-top: 16px; padding: 10px 16px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">Open your orders</a>
    `
  );

  await sendSafely({
    from: fromAddress(),
    to: recipientEmail,
    subject: `New order ${order.orderNumber} — ${formatCents(order.totalCents)}`,
    html,
  });
}

/** "The thing you asked about is on sale now" alert for a pre-book sign-up. */
export async function sendBackInStockEmail(
  recipientEmail: string,
  listing: { title: string; slug: string }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const listingUrl = `${appUrl}/listings/${listing.slug}`;

  const html = layout(
    "It's available now",
    `
      <p style="font-size: 14px;">
        Good news — <strong>${listing.title}</strong> is available to buy on EZBZ.
      </p>
      <p style="font-size: 13px; color: #64748b; margin-top: 8px;">
        You asked to be told when this went on sale. Stock on releases like this
        tends to move quickly.
      </p>
      <a href="${listingUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 16px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">View the listing</a>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
        This is a one-off alert for this item — you won't hear from us about it again.
      </p>
    `
  );

  await sendSafely({
    from: fromAddress(),
    to: recipientEmail,
    subject: `${listing.title} is available now`,
    html,
  });
}

/** "You have a new message" alert for a listing conversation. */
export async function sendNewMessageEmail({
  recipientEmail,
  senderName,
  listingTitle,
  body,
  conversationId,
}: {
  recipientEmail: string;
  senderName: string;
  listingTitle: string;
  body: string;
  conversationId: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // The message is user-authored, so it's escaped before going into the HTML.
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = layout(
    `New message about ${listingTitle}`,
    `
      <p style="font-size: 14px;">
        <strong>${senderName}</strong> sent you a message about
        <strong>${listingTitle}</strong>.
      </p>
      <blockquote style="margin: 16px 0; padding: 12px 14px; background: #f4f6fa; border-left: 3px solid #c9a227; border-radius: 6px; font-size: 14px; white-space: pre-line;">${safeBody}</blockquote>
      <a href="${appUrl}/account/messages/${conversationId}" style="display: inline-block; margin-top: 8px; padding: 10px 16px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">Reply</a>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
        You'll only get one email per conversation until you've read it.
      </p>
    `
  );

  await sendSafely({
    from: fromAddress(),
    to: recipientEmail,
    subject: `${senderName} messaged you about ${listingTitle}`,
    html,
  });
}

export async function sendPasswordResetEmail(recipientEmail: string, resetUrl: string) {
  const html = layout(
    "Reset your password",
    `
      <p style="font-size: 14px;">
        We received a request to reset the password for your EZBZ account. Click the button
        below to choose a new one. This link expires in 1 hour and can only be used once.
      </p>
      <a href="${resetUrl}" style="display: inline-block; margin-top: 16px; padding: 10px 16px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px;">Reset password</a>
      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
        Requested a reset more than once? Only the newest email works — older links stop
        working as soon as a new one is sent.
      </p>
      <p style="font-size: 13px; color: #64748b; margin-top: 12px;">
        If you didn't request this, you can safely ignore this email — your password won't change.
      </p>
    `
  );

  await sendSafely({
    from: fromAddress(),
    to: recipientEmail,
    subject: "Reset your EZBZ password",
    html,
  });
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
