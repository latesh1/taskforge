const cron = require('node-cron');
const { db } = require('../db/db');
const { sendNotificationEmail } = require('../utils/mailer');

/**
 * Start the background scheduler to monitor deadlines and send alerts.
 */
function startScheduler() {
  // Run every minute for local testing/demonstration
  cron.schedule('*/1 * * * *', async () => {
    console.log('[CRON] Checking task deadlines...');
    try {
      const now = new Date();
      
      // Fetch active tasks that are NOT completed or blocked
      const tasks = await db('tasks')
        .select(
          'tasks.id as taskId',
          'tasks.name as taskName',
          'tasks.deadline',
          'tasks.status',
          'projects.id as projectId',
          'projects.name as projectName',
          'projects.manager_id as managerId',
          'pm.email as pmEmail',
          'pm.name as pmName'
        )
        .join('projects', 'tasks.project_id', '=', 'projects.id')
        .join('users as pm', 'projects.manager_id', '=', 'pm.id')
        .whereNotIn('tasks.status', ['Completed', 'Blocked']);

      for (const task of tasks) {
        const deadline = new Date(task.deadline);
        const diffMs = deadline - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Fetch assigned employees
        const assignments = await db('task_assignments')
          .select('users.id as employeeId', 'users.name as employeeName', 'users.email as employeeEmail')
          .join('users', 'task_assignments.employee_id', '=', 'users.id')
          .where('task_assignments.task_id', task.taskId);

        if (assignments.length === 0) continue;

        // Process reminders for each assigned employee
        for (const emp of assignments) {
          if (diffHours > 0) {
            // Task is upcoming. Check the 48h, 24h, 12h, and 1h thresholds.
            let reminderType = null;
            let reminderText = '';

            if (diffHours <= 1) {
              reminderType = '1_HOUR_REMINDER';
              reminderText = '1 hour';
            } else if (diffHours <= 12) {
              reminderType = '12_HOUR_REMINDER';
              reminderText = '12 hours';
            } else if (diffHours <= 24) {
              reminderType = '24_HOUR_REMINDER';
              reminderText = '24 hours';
            } else if (diffHours <= 48) {
              reminderType = '48_HOUR_REMINDER';
              reminderText = '48 hours';
            }

            if (reminderType) {
              // Check if we already sent this specific reminder to the employee
              const sentCount = await db('notifications')
                .count('id as count')
                .where({
                  user_id: emp.employeeId,
                  type: reminderType,
                })
                .andWhere('message', 'like', `%Task #${task.taskId}%`)
                .first();

              if (sentCount.count === 0) {
                // 1. Notify Employee
                await sendNotificationEmail({
                  userId: emp.employeeId,
                  email: emp.employeeEmail,
                  type: reminderType,
                  subject: `Upcoming Deadline: ${task.taskName}`,
                  body: `Hi ${emp.employeeName}, this is a reminder that Task #${task.taskId} ("${task.taskName}") under Project "${task.projectName}" is due in ${reminderText} (${deadline.toLocaleString()}). Please update your work logs accordingly.`,
                });

                // 2. Notify Project Manager (PM alerts requirement)
                await sendNotificationEmail({
                  userId: task.managerId,
                  email: task.pmEmail,
                  type: `PM_${reminderType}`,
                  subject: `Upcoming Task Deadline Alert (PM)`,
                  body: `Hi ${task.pmName}, your assigned employee ${emp.employeeName} has an upcoming deadline for Task #${task.taskId} ("${task.taskName}") in ${reminderText} (${deadline.toLocaleString()}).`,
                });
              }
            }
          } else {
            // Task is OVERDUE (diffHours <= 0)
            const sentCount = await db('notifications')
              .count('id as count')
              .where({
                user_id: emp.employeeId,
                type: 'OVERDUE_ALERT',
              })
              .andWhere('message', 'like', `%Task #${task.taskId}%`)
              .first();

            if (sentCount.count === 0) {
              // 1. Alert Employee
              await sendNotificationEmail({
                userId: emp.employeeId,
                email: emp.employeeEmail,
                type: 'OVERDUE_ALERT',
                subject: `Overdue Task Alert: ${task.taskName}`,
                body: `Hi ${emp.employeeName}, Task #${task.taskId} ("${task.taskName}") was due on ${deadline.toLocaleString()} and is now OVERDUE. Please log your hours and update the status.`,
              });

              // 2. Alert Project Manager
              await sendNotificationEmail({
                userId: task.managerId,
                email: task.pmEmail,
                type: 'OVERDUE_ALERT',
                subject: `Overdue Task Alert (PM): ${task.taskName}`,
                body: `Hi ${task.pmName}, Task #${task.taskId} ("${task.taskName}") assigned to ${emp.employeeName} has missed its deadline (${deadline.toLocaleString()}) and is marked overdue.`,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[CRON ERROR]', err.message);
    }
  });
  console.log('Cron scheduler successfully initialized.');
}

module.exports = {
  startScheduler,
};
