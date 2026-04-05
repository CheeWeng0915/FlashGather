const nodemailer = require('nodemailer');

const MAILER_REQUIRED_ENV_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME'
];

const readEnvValue = (key) => String(process.env[key] || '').trim();

const isMailerConfigured = () =>
  MAILER_REQUIRED_ENV_VARS.every((key) => readEnvValue(key).length > 0);

const parseSecureSetting = () => readEnvValue('SMTP_SECURE').toLowerCase() === 'true';

const formatSender = () => {
  const fromName = readEnvValue('SMTP_FROM_NAME');
  const fromEmail = readEnvValue('SMTP_FROM_EMAIL');
  return fromName ? `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>` : fromEmail;
};

const createTransport = () =>
  nodemailer.createTransport({
    host: readEnvValue('SMTP_HOST'),
    port: Number(readEnvValue('SMTP_PORT')) || 587,
    secure: parseSecureSetting(),
    auth: {
      user: readEnvValue('SMTP_USER'),
      pass: readEnvValue('SMTP_PASS')
    }
  });

const sendPasswordResetOtpEmail = async ({
  otp,
  toEmail,
  toName,
  expiresInMinutes
}) => {
  if (!isMailerConfigured()) {
    throw new Error('SMTP mailer is not fully configured.');
  }

  const transporter = createTransport();
  const greetingName = String(toName || '').trim() || 'there';
  const appName = readEnvValue('SMTP_FROM_NAME') || 'FlashGather';

  await transporter.sendMail({
    from: formatSender(),
    to: toEmail,
    subject: `${appName} password reset OTP`,
    text: [
      `Hello ${greetingName},`,
      '',
      `We received a request to reset your ${appName} password.`,
      `Your one-time password (OTP) is: ${otp}`,
      '',
      `This code expires in ${expiresInMinutes} minutes.`,
      'If you did not request a password reset, you can safely ignore this email.',
      '',
      `${appName}`
    ].join('\n')
  });
};

module.exports = {
  isMailerConfigured,
  sendPasswordResetOtpEmail
};
