import { env } from '../config/env.js';

// Sends a short email to the admin (FR-63). Uses the Resend HTTP API when it is
// configured; otherwise only logs it, so development and tests need no email account.
// Never throws: a failed email must not fail the player's request.
export async function emailAdmin(subject: string, text: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.ADMIN_EMAIL) {
    if (env.NODE_ENV === 'development') console.info(`[email to admin] ${subject}\n${text}`);
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.MAIL_FROM, to: env.ADMIN_EMAIL, subject, text }),
    });
    if (!response.ok) console.error(`Admin email failed: ${response.status}`);
  } catch (error) {
    console.error('Admin email failed:', error);
  }
}
