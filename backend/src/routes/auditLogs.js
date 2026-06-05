const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { authenticate, checkRole } = require('../middleware/auth');

// GET /api/audit-logs (Admin only)
router.get('/', authenticate, checkRole(['ADMIN']), async (req, res, next) => {
  try {
    const logs = await db('audit_logs')
      .select(
        'audit_logs.*',
        'users.name as user_name',
        'users.email as user_email',
        'roles.name as user_role'
      )
      .join('users', 'audit_logs.user_id', '=', 'users.id')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .orderBy('audit_logs.timestamp', 'desc')
      .limit(200); // return up to 200 most recent logs

    // Parse JSON string fields safely for frontend
    const parsedLogs = logs.map(log => {
      let prevVal = null;
      let newVal = null;
      try {
        if (log.previous_value) prevVal = JSON.parse(log.previous_value);
      } catch (e) {
        prevVal = log.previous_value;
      }
      try {
        if (log.new_value) newVal = JSON.parse(log.new_value);
      } catch (e) {
        newVal = log.new_value;
      }
      return {
        ...log,
        previous_value: prevVal,
        new_value: newVal,
      };
    });

    res.json(parsedLogs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
