const { getSmtpConfig } = require('./emailService');
const nodemailer = require('nodemailer');

function getNotificationSettings(user) {
  return user?.profile_settings?.notifications || {};
}

function shouldSendEmail(user) {
  const settings = getNotificationSettings(user);
  return Boolean(settings.email);
}

async function sendUserEmailNotification(user, { subject, title, message, details = [] }) {
  if (!user?.email || !shouldSendEmail(user)) {
    return false;
  }

  const safeTitle = title || 'Notification';
  const safeMessage = message || '';
  const detailRows = details.filter(Boolean).map((item) => `<li>${item}</li>`).join('');
  const htmlDetails = detailRows ? `<ul style="margin: 12px 0 0; padding-left: 18px;">${detailRows}</ul>` : '';

  const config = getSmtpConfig();
  if (!config) {
    return false;
  }
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to: user.email,
    subject: subject || safeTitle,
    text: `${safeTitle}\n\n${safeMessage}${details.length ? `\n\n${details.join('\n')}` : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">${safeTitle}</h2>
        <p>${safeMessage}</p>
        ${htmlDetails}
      </div>
    `,
  });

  return true;
}

module.exports = {
  getNotificationSettings,
  shouldSendEmail,
  sendUserEmailNotification,
};