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

module.exports = { sendEmail };


