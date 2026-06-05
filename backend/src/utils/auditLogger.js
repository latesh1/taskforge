const { db } = require('../db/db');

/**
 * Log an action to the audit_logs table
 * @param {object} params
 * @param {number} params.userId User performing the action
 * @param {string} params.action Description of action (e.g. 'LOGIN', 'PROJECT_CREATE', 'TASK_UPDATE')
 * @param {string} params.entityType Class of target (e.g. 'PROJECT', 'TASK', 'USER', 'WORK_LOG', 'REPLY')
 * @param {number} params.entityId Id of the target record
 * @param {object} [params.previousValue] Old fields state (optional)
 * @param {object} [params.newValue] New fields state (optional)
 */
async function logAudit({ userId, action, entityType, entityId, previousValue = null, newValue = null }) {
  try {
    const prevStr = previousValue ? JSON.stringify(previousValue) : null;
    const newStr = newValue ? JSON.stringify(newValue) : null;

    await db('audit_logs').insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      previous_value: prevStr,
      new_value: newStr,
    });
  } catch (err) {
    console.error('Audit Logger Failure:', err.message);
  }
}

module.exports = {
  logAudit,
};
