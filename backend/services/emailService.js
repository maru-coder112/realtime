const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

async function sendVerificationCodeEmail({ to, username, code }) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('Email service is not configured. Missing SMTP settings.');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const safeName = username || 'Trader';

  await transporter.sendMail({
    from: config.from,
    to,
    subject: 'Verify your email address',
    text: `Hello ${safeName},\n\nYour verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nIf you did not create this account, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.4; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">Email Verification</h2>
        <p>Hello <strong>${safeName}</strong>,</p>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; letter-spacing: 4px; font-weight: 700; margin: 8px 0 12px;">${code}</p>
        <p>This code expires in <strong>15 minutes</strong>.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  });
}

module.exports = {
  sendVerificationCodeEmail,
  getSmtpConfig,
};
