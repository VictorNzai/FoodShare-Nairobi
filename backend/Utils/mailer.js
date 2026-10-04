const nodemailer = require('nodemailer');
require('dotenv').config();

function createTransportFromEnv(prefix) {
  const user = process.env[`${prefix}_USER`];
  const pass = process.env[`${prefix}_PASSWORD`];
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

const providers = {
  provider1: createTransportFromEnv('EMAIL1') || createTransportFromEnv('EMAIL'),
  provider2: createTransportFromEnv('EMAIL2')
};

function getProvider(providerName) {
  if (providerName && providers[providerName]) return providerName;
  return providers.provider1 ? 'provider1' : (providers.provider2 ? 'provider2' : null);
}

async function sendEmail({ to, subject, html, provider: requestedProvider }) {
  const providerName = getProvider(requestedProvider);
  if (!providerName) throw new Error('No email provider configured');
  const transporter = providers[providerName];
  const from = (providerName === 'provider2' ? process.env.EMAIL2_USER : (process.env.EMAIL1_USER || process.env.EMAIL_USER));
  return transporter.sendMail({ from, to, subject, html });
}

// Escape user-supplied text before putting it into an email's HTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Wrap an email's content in the FoodShare look (olive frame, cream panel),
 * matching the website. Inline styles only: email clients ignore stylesheets.
 * @param {object} options
 * @param {string} options.heading - Short title shown at the top (plain text).
 * @param {string} options.body - HTML for the message. Escape user data with escapeHtml().
 * @param {{label: string, url: string}} [options.button] - Optional call to action.
 */
function emailLayout({ heading, body, button }) {
  const buttonHtml = button
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#232a1a;color:#f0eddc;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:14px 24px;border-radius:999px;">${escapeHtml(button.label)}</a></p>`
    : '';
  return `<div style="margin:0;padding:24px 12px;background:#232a1a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td style="padding:4px 8px 16px;color:#f0eddc;font-size:18px;font-weight:bold;">FoodShare Kenya</td></tr>
    <tr><td style="background:#f0eddc;border-radius:24px;padding:32px 28px;color:#1d2415;font-size:15px;line-height:1.6;">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.2;text-transform:uppercase;color:#1d2415;">${escapeHtml(heading)}</h1>
      ${body}
      ${buttonHtml}
    </td></tr>
    <tr><td style="padding:16px 8px 0;color:#d3d0bd;font-size:12px;">Fighting hunger, one meal at a time.</td></tr>
  </table>
</div>`;
}

/**
 * A two-column list of details for an email body.
 * @param {Array<[string, string]>} rows - [label, value] pairs; values are escaped here.
 */
function emailDetails(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">${rows
    .map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#4b5540;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;font-weight:bold;">${escapeHtml(value)}</td></tr>`)
    .join('')}</table>`;
}

module.exports = { sendEmail, emailLayout, emailDetails, escapeHtml };
