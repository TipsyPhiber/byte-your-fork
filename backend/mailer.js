const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// SMTP_FROM may already include a display name (e.g. `"Team" <a@b.com>`).
// Only wrap a bare address; otherwise nodemailer/SMTP rejects the header.
const fromAddress = (() => {
  const raw = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  if (!raw) return '';
  return /<[^>]+>/.test(raw) ? raw : `"Byte Your Fork" <${raw}>`;
})();

async function sendVerificationEmail(to, firstName, code) {
  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Verify Your Email',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #111827;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0;">Byte Your Fork</h1>
          <p style="color: #4b5563; margin: 8px 0 0;">Your personal recipe companion</p>
        </div>
        <div style="background: #f3f4f6; border-radius: 16px; padding: 32px; text-align: center;">
          <h2 style="color: #1e40af; margin-top: 0;">Hi ${firstName}, verify your email</h2>
          <p style="line-height: 1.7; color: #4b5563;">Enter this code in the app to complete your signup. It expires in <strong>15 minutes</strong>.</p>
          <div style="background: white; border-radius: 12px; padding: 24px; margin: 24px 0; border: 2px solid #e5e7eb;">
            <span style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #1e40af;">${code}</span>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you didn't create an account, you can ignore this email.</p>
        </div>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(to, resetUrl) {
  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #111827;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0;">Byte Your Fork</h1>
        </div>
        <div style="background: #f3f4f6; border-radius: 16px; padding: 32px;">
          <h2 style="color: #1e40af; margin-top: 0;">Password Reset Request</h2>
          <p style="line-height: 1.7;">We received a request to reset your password. Click the button below to set a new one. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; margin-top: 16px;">
            Reset Password
          </a>
          <p style="color: #4b5563; font-size: 13px; margin-top: 20px; word-break: break-all;">
            Or copy this link: <br/><span style="color: #6366f1;">${resetUrl}</span>
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will not change.
        </p>
      </div>
    `,
  });
}

async function sendShoppingListEmail(to, firstName, items) {
  const rows = items.map(it => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #1e40af; width: 100px;">${escapeHtml(it.amount || '')}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${escapeHtml(it.ingredient_name)}${it.recipe_title ? `<div style="font-size: 11px; color: #9ca3af;">from ${escapeHtml(it.recipe_title)}</div>` : ''}</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `Your shopping list (${items.length} item${items.length === 1 ? '' : 's'})`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #111827;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e40af; font-size: 24px; margin: 0;">Byte Your Fork</h1>
        </div>
        <h2 style="color: #1e40af;">${escapeHtml(firstName) || 'Hey'}, here's your shopping list</h2>
        <table style="width: 100%; border-collapse: collapse; background: #f9fafb; border-radius: 12px; overflow: hidden; margin-top: 16px;">
          <tbody>${rows}</tbody>
        </table>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">Sent from Byte Your Fork</p>
      </div>
    `,
  });
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendShoppingListEmail };
