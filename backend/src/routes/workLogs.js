const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/db');
const { authenticate, checkRole } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { sendNotificationEmail } = require('../utils/mailer');

// Multer attachment storage engine config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit files to 5MB
});

// GET /api/work-logs (filters: employeeId, projectId, startDate, endDate)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { employeeId, projectId, startDate, endDate } = req.query;

    let query = db('work_logs')
      .select(
        'work_logs.*',
        'users.name as employee_name',
        'users.email as employee_email',
        'tasks.name as task_name',
        'tasks.project_id as project_id',
        'projects.name as project_name',
        'projects.manager_id as project_manager_id'
      )
      .join('users', 'work_logs.employee_id', '=', 'users.id')
      .join('tasks', 'work_logs.task_id', '=', 'tasks.id')
      .join('projects', 'tasks.project_id', '=', 'projects.id');

    // Role boundaries
    if (req.user.role === 'PROJECT_MANAGER') {
      query = query.where('projects.manager_id', req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      query = query.where('work_logs.employee_id', req.user.id);
    }

    // Filters
    if (employeeId) {
      query = query.where('work_logs.employee_id', employeeId);
    }
    if (projectId) {
      query = query.where('tasks.project_id', projectId);
    }
    if (startDate) {
      query = query.where('work_logs.created_at', '>=', startDate);
    }
    if (endDate) {
      query = query.where('work_logs.created_at', '<=', endDate);
    }

    const logs = await query.orderBy('work_logs.created_at', 'desc');
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/work-logs/:id/replies (Get full replies thread for a work log)
router.get('/:id/replies', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user has access to this log
    const log = await db('work_logs')
      .select('work_logs.*', 'projects.manager_id as project_manager_id')
      .join('tasks', 'work_logs.task_id', '=', 'tasks.id')
      .join('projects', 'tasks.project_id', '=', 'projects.id')
      .where('work_logs.id', id)
      .first();

    if (!log) {
      return res.status(404).json({ error: 'Work log not found' });
    }

    if (req.user.role === 'PROJECT_MANAGER' && log.project_manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: This log is from a project you do not manage' });
    }
    if (req.user.role === 'EMPLOYEE' && log.employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only view replies to your own work logs' });
    }

    const replies = await db('log_replies')
      .select('log_replies.*', 'users.name as user_name', 'roles.name as user_role')
      .join('users', 'log_replies.user_id', '=', 'users.id')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('log_replies.log_id', id)
      .orderBy('log_replies.created_at', 'asc');

    res.json(replies);
  } catch (err) {
    next(err);
  }
});

// POST /api/work-logs (Submit work log, Employee only)
router.post('/', authenticate, checkRole(['EMPLOYEE']), upload.single('attachment'), async (req, res, next) => {
  try {
    const { task_id, description, hours_worked } = req.body;

    if (!task_id || !description || !hours_worked) {
      return res.status(400).json({ error: 'Task ID, Description, and Hours Worked are required' });
    }

    // Verify task is assigned to this employee
    const assigned = await db('task_assignments')
      .where({ task_id, employee_id: req.user.id })
      .first();

    if (!assigned) {
      return res.status(403).json({ error: 'Forbidden: You can only log work on tasks assigned to you' });
    }

    const attachment_path = req.file ? `/uploads/${req.file.filename}` : null;

    const [newId] = await db('work_logs').insert({
      task_id,
      employee_id: req.user.id,
      description,
      hours_worked: Number(hours_worked),
      attachment_path,
    }).returning('id');

    const createdLogId = newId.id || newId;

    const createdLog = await db('work_logs').where('id', createdLogId).first();

    // Fetch PM details to notify them
    const taskDetails = await db('tasks')
      .select('tasks.name as task_name', 'projects.name as project_name', 'projects.manager_id as manager_id')
      .join('projects', 'tasks.project_id', '=', 'projects.id')
      .where('tasks.id', task_id)
      .first();

    const pmUser = await db('users').where('id', taskDetails.manager_id).first();

    // Notify Manager
    await sendNotificationEmail({
      userId: pmUser.id,
      email: pmUser.email,
      type: 'LOG_SUBMISSION',
      subject: `New Work Log Submitted: Task #${task_id}`,
      body: `Hi ${pmUser.name}, employee ${req.user.name} logged ${hours_worked} hours on Task #${task_id} ("${taskDetails.task_name}"). Log: "${description}"`,
    });

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'WORK_LOG_SUBMIT',
      entityType: 'WORK_LOG',
      entityId: createdLogId,
      newValue: createdLog,
    });

    res.status(201).json(createdLog);
  } catch (err) {
    next(err);
  }
});

// POST /api/work-logs/:id/replies (Reply to work logs, PMs and assigned Employees)
router.post('/:id/replies', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply_text } = req.body;

    if (!reply_text || reply_text.trim() === '') {
      return res.status(400).json({ error: 'Reply text cannot be empty' });
    }

    // Fetch log and project context
    const log = await db('work_logs')
      .select(
        'work_logs.*',
        'tasks.name as task_name',
        'projects.name as project_name',
        'projects.manager_id as project_manager_id'
      )
      .join('tasks', 'work_logs.task_id', '=', 'tasks.id')
      .join('projects', 'tasks.project_id', '=', 'projects.id')
      .where('work_logs.id', id)
      .first();

    if (!log) {
      return res.status(404).json({ error: 'Work log not found' });
    }

    // Check boundary clearances
    const isOwner = log.employee_id === req.user.id;
    const isManager = log.project_manager_id === req.user.id;

    if (req.user.role === 'PROJECT_MANAGER' && !isManager) {
      return res.status(403).json({ error: 'Forbidden: You cannot comment on other managers work logs' });
    }
    if (req.user.role === 'EMPLOYEE' && !isOwner) {
      return res.status(403).json({ error: 'Forbidden: You can only comment on your own work logs' });
    }

    // Insert Reply
    const [newId] = await db('log_replies').insert({
      log_id: id,
      user_id: req.user.id,
      reply_text,
    }).returning('id');

    const createdReplyId = newId.id || newId;

    const createdReply = await db('log_replies')
      .select('log_replies.*', 'users.name as user_name')
      .join('users', 'log_replies.user_id', '=', 'users.id')
      .where('log_replies.id', createdReplyId)
      .first();

    // Notify the other party
    if (req.user.role === 'PROJECT_MANAGER') {
      // Notify Employee
      const employeeUser = await db('users').where('id', log.employee_id).first();
      await sendNotificationEmail({
        userId: log.employee_id,
        email: employeeUser.email,
        type: 'LOG_REPLY_EMPLOYEE',
        subject: `Manager Comment on Work Log: Task #${log.task_id}`,
        body: `Hi ${employeeUser.name}, Project Manager ${req.user.name} replied to your work log: "${reply_text}"`,
      });
    } else if (req.user.role === 'EMPLOYEE') {
      // Notify PM
      const pmUser = await db('users').where('id', log.project_manager_id).first();
      await sendNotificationEmail({
        userId: log.project_manager_id,
        email: pmUser.email,
        type: 'LOG_REPLY_PM',
        subject: `Employee Reply on Work Log: Task #${log.task_id}`,
        body: `Hi ${pmUser.name}, employee ${req.user.name} replied to their work log: "${reply_text}"`,
      });
    }

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'WORK_LOG_REPLY',
      entityType: 'WORK_LOG',
      entityId: Number(id),
      newValue: { reply_id: createdReplyId, reply_text },
    });

    res.status(201).json(createdReply);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
