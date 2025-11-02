import nodemailer from 'nodemailer';

// Check if SMTP is configured
const isConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

// Create transporter
const transporter = isConfigured
  ? nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

// Email templates
const templates = {
  lessonReminder: (data) => ({
    subject: `Reminder: Lesson Tomorrow at ${data.startTime}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Lesson Reminder</h2>
        <p>Hello ${data.recipientName},</p>
        <p>This is a friendly reminder that you have a lesson tomorrow:</p>
        <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p><strong>Date:</strong> ${data.date}</p>
          <p><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
          <p><strong>Instrument:</strong> ${data.instrument}</p>
          <p><strong>Room:</strong> ${data.room}</p>
          ${data.teacherName ? `<p><strong>Teacher:</strong> ${data.teacherName}</p>` : ''}
          ${data.studentName ? `<p><strong>Student:</strong> ${data.studentName}</p>` : ''}
        </div>
        <p>See you tomorrow!</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #718096; font-size: 12px;">
          This is an automated message from SOLU Worship Music School.
        </p>
      </div>
    `,
    text: `Hello ${data.recipientName},\n\nThis is a friendly reminder that you have a lesson tomorrow:\n\nDate: ${data.date}\nTime: ${data.startTime} - ${data.endTime}\nInstrument: ${data.instrument}\nRoom: ${data.room}\n\nSee you tomorrow!\n\nSOLU Worship Music School`,
  }),

  pinReset: (data) => ({
    subject: 'Your Check-In PIN Has Been Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">PIN Reset</h2>
        <p>Hello ${data.recipientName},</p>
        <p>Your check-in PIN has been reset. Your new PIN is:</p>
        <div style="background: #28a745; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; border-radius: 8px;">
          ${data.pin}
        </div>
        <p><strong>Important:</strong> Please keep this PIN secure and do not share it with others.</p>
        <p>You can use this PIN to check in for your lessons up to 60 minutes before they start.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #718096; font-size: 12px;">
          This is an automated message from SOLU Worship Music School.
        </p>
      </div>
    `,
    text: `Hello ${data.recipientName},\n\nYour check-in PIN has been reset. Your new PIN is: ${data.pin}\n\nPlease keep this PIN secure and do not share it with others.\n\nSOLU Worship Music School`,
  }),

  dailySummary: (data) => ({
    subject: `Your Lessons Today - ${data.date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Your Schedule for Today</h2>
        <p>Hello ${data.recipientName},</p>
        <p>You have ${data.totalLessons} lesson(s) scheduled for today:</p>
        ${data.lessonsList}
        <p>Please remember to check in when you arrive using your PIN.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #718096; font-size: 12px;">
          This is an automated message from SOLU Worship Music School.
        </p>
      </div>
    `,
    text: `Hello ${data.recipientName},\n\nYou have ${data.totalLessons} lesson(s) scheduled for today.\n\n${data.lessonsListText}\n\nSOLU Worship Music School`,
  }),
};

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} templateName - Template name
 * @param {object} data - Template data
 */
export async function sendEmail(to, templateName, data) {
  if (!isConfigured) {
    console.log('📧 Email not configured. Would send to:', to);
    console.log('Template:', templateName);
    console.log('Data:', data);
    return { success: true, message: 'Email logging only (not configured)' };
  }

  try {
    const template = templates[templateName](data);

    const info = await transporter.sendMail({
      from: `"SOLU Music School" <${process.env.SMTP_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send bulk emails
 * @param {array} recipients - Array of recipient objects with email property
 * @param {string} templateName - Template name
 * @param {function|object} dataFn - Function to generate data per recipient or static data
 */
export async function sendBulkEmails(recipients, templateName, dataFn) {
  const results = [];

  for (const recipient of recipients) {
    const data = typeof dataFn === 'function' ? dataFn(recipient) : dataFn;
    const result = await sendEmail(recipient.email, templateName, data);
    results.push({ email: recipient.email, ...result });
  }

  return results;
}
