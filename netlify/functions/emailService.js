const RESEND_API_URL = 'https://api.resend.com/emails';

function getFromAddress() {
  return String(process.env.EMAIL_FROM || '').trim() || 'The Latest <onboarding@resend.dev>';
}

// No transactional email provider is wired up by default. Until RESEND_API_KEY
// is set, this logs the message (including any reset link) to the function's
// console output instead of throwing, so the password-reset flow is still
// fully testable locally and in `netlify dev` before a real provider exists.
async function sendEmail({ to, subject, html, text } = {}) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();

  if (!apiKey) {
    console.warn('[emailService] RESEND_API_KEY not set — logging email instead of sending.', {
      to,
      subject,
      body: text || html
    });
    return { sent: false, logged: true };
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [to],
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Email provider error (${response.status}): ${body}`);
  }

  return { sent: true, logged: false };
}

module.exports = { sendEmail };
