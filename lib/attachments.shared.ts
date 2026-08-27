/**
 * Attachment limits shared by the client picker and the server action.
 *
 * Separate from lib/attachments.ts because that module is server-only; the
 * browser needs these numbers to give immediate feedback, and the server
 * re-checks them because client-side validation is a courtesy, not a control.
 */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
