const { db } = require('../db/db');

// In-memory array to track simulated outgoing email messages
const sentEmailsLog = [];

/**
 * Send simulated email to users, log details internally, and write database notification records.
 * @param {object} params
 * @param {number} params.userId User receiving the notification/email
 * @param {string} params.email User's email address
 * @param {string} params.type Type of notification (e.g. 'DEADLINE_REMINDER', 'OVERDUE_ALERT', 'TASK_ASSIGNED')
 * @param {string} params.subject Subject of the email
 * @param {string} params.body Body content of the email
 */
async function sendNotificationEmail({ userId, email, type, subject, body }) {
  try {
    // 1. Insert notification record in the DB
    await db('notifications').insert({
      user_id: userId,
      type: type,
      message: `${subject}: ${body.substring(0, 150)}...`,
      is_read: false,
    });

    // 2. Queue simulated email log
    const emailRecord = {
      id: Date.now() + Math.random().toString(36).substring(2, 7),
      userId,
      email,
      type,
      subject,
      body,
      timestamp: new Date().toISOString(),
    };
    
    sentEmailsLog.push(emailRecord);
    // Keep log limited to last 100 emails
    if (sentEmailsLog.length > 100) {
      sentEmailsLog.shift();
    }

    console.log(`[EMAIL DISPATCHED] To: ${email} | Subject: "${subject}" | Type: ${type}`);
  } catch (err) {
    console.error('Error logging notification/email:', err.message);
  }
}

/**
 * Get all simulated emails sent since startup
 */
function getSentEmailsLog() {
  return sentEmailsLog;
}

/**
 * Clear email logs
 */
function clearSentEmailsLog() {
  sentEmailsLog.length = 0;
}

module.exports = {
  sendNotificationEmail,
  getSentEmailsLog,
  clearSentEmailsLog,
};
