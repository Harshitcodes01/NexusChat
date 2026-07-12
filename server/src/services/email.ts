import nodemailer from 'nodemailer';

const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.mailtrap.io';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '2525', 10);
const EMAIL_USER = process.env.EMAIL_USER || 'mock_user';
const EMAIL_PASS = process.env.EMAIL_PASS || 'mock_pass';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@nexuschat.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

export const sendEmail = async (options: {
  email: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> => {
  const isMock = EMAIL_USER === 'mock_user' || EMAIL_USER.includes('your_smtp');
  
  if (isMock) {
    console.log('\n================================ MOCK EMAIL SENT ================================');
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message:\n${options.text}`);
    console.log('=================================================================================\n');
    return;
  }

  const mailOptions = {
    from: EMAIL_FROM,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  
  const subject = 'NexusChat - Email Verification';
  const text = `Welcome to NexusChat! Please verify your email by clicking: ${verifyUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6366f1; text-align: center;">Welcome to NexusChat!</h2>
      <p>Thank you for registering. Please click the button below to verify your email address and active your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this URL into your browser:</p>
      <p style="font-size: 12px; color: #6366f1; word-break: break-all;">${verifyUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">NexusChat, Inc.</p>
    </div>
  `;

  await sendEmail({ email, subject, text, html });
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  
  const subject = 'NexusChat - Password Reset';
  const text = `You requested a password reset. Please click: ${resetUrl}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #6366f1; text-align: center;">Reset Your Password</h2>
      <p>We received a request to reset your password. Please click the button below to complete the process. This link is valid for 1 hour.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>
      <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this URL into your browser:</p>
      <p style="font-size: 12px; color: #6366f1; word-break: break-all;">${resetUrl}</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">NexusChat, Inc.</p>
    </div>
  `;

  await sendEmail({ email, subject, text, html });
};
