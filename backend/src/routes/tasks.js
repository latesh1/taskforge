const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { authenticate, checkRole } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { sendNotificationEmail } = require('../utils/mailer');

// Helper to fetch full task assignments details
async function getTaskAssignees(taskId) {
  return db('task_assignments')
    .select('users.id', 'users.name', 'users.email')
    .join('users', 'task_assignments.employee_id', '=', 'users.id')
    .where('task_assignments.task_id', taskId);
}

// GET /api/tasks (with filters: status, priority, employeeId, projectId)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, priority, employeeId, projectId, search } = req.query;

    let query = db('tasks')
      .select(
        'tasks.*',
        'projects.name as project_name',
        'projects.manager_id as project_manager_id',
        'creator.name as creator_name'
      )
      .join('projects', 'tasks.project_id', '=', 'projects.id')
      .join('users as creator', 'tasks.created_by', '=', 'creator.id');

    // Role scoping
    if (req.user.role === 'PROJECT_MANAGER') {
      query = query.where('projects.manager_id', req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      const assignedTaskIds = db('task_assignments')
        .select('task_id')
        .where('employee_id', req.user.id);
      query = query.whereIn('tasks.id', assignedTaskIds);
    }

    // Apply filters
    if (status) query = query.where('tasks.status', status);
    if (priority) query = query.where('tasks.priority', priority);
    if (projectId) query = query.where('tasks.project_id', projectId);
    if (search) {
      query = query.where((q) => {
        q.where('tasks.name', 'like', `%${search}%`)
          .orWhere('tasks.description', 'like', `%${search}%`);
      });
    }

    // Filter by assigned employee
    if (employeeId) {
      const empTaskIds = db('task_assignments')
        .select('task_id')
        .where('employee_id', employeeId);
      query = query.whereIn('tasks.id', empTaskIds);
    }

    const tasks = await query.orderBy('tasks.created_at', 'desc');

    // Attach assignees to each task object
    const tasksWithAssignees = await Promise.all(
      tasks.map(async (task) => {
        const assignees = await getTaskAssignees(task.id);
        return { ...task, assignees };
      })
    );

    res.json(tasksWithAssignees);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id (Single task details with timeline/logs)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await db('tasks')
      .select('tasks.*', 'projects.name as project_name', 'projects.manager_id as project_manager_id')
      .join('projects', 'tasks.project_id', '=', 'projects.id')
      .where('tasks.id', id)
      .first();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verification check for PMs and Employees
    if (req.user.role === 'PROJECT_MANAGER' && task.project_manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned project managers' });
    }
    if (req.user.role === 'EMPLOYEE') {
      const assigned = await db('task_assignments')
        .where({ task_id: id, employee_id: req.user.id })
        .first();
      if (!assigned) {
        return res.status(403).json({ error: 'Forbidden: Access restricted to task assignees' });
      }
    }

    const assignees = await getTaskAssignees(task.id);
    res.json({ ...task, assignees });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks (Admin or PM for their project)
router.post('/', authenticate, checkRole(['ADMIN', 'PROJECT_MANAGER']), async (req, res, next) => {
  try {
    const { name, description, priority, status, deadline, project_id, estimated_hours, assignees } = req.body;

    if (!name || !deadline || !project_id) {
      return res.status(400).json({ error: 'Task Name, Deadline, and Project are required' });
    }

    // Verify project exists
    const project = await db('projects').where('id', project_id).first();
    if (!project) {
      return res.status(400).json({ error: 'Selected project does not exist' });
    }

    // PM Access Lock
    if (req.user.role === 'PROJECT_MANAGER' && project.manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot add tasks to projects managed by others' });
    }

    // Insert Task
    const [newId] = await db('tasks').insert({
      name,
      description,
      priority: priority || 'Medium',
      status: status || 'To Do',
      deadline: new Date(deadline),
      project_id,
      estimated_hours: estimated_hours || 0,
      created_by: req.user.id,
    }).returning('id');

    const createdTaskId = newId.id || newId;

    // Handle assignments
    if (assignees && Array.isArray(assignees)) {
      for (const empId of assignees) {
        // Confirm user is an employee
        const empUser = await db('users')
          .select('users.id', 'users.email', 'users.name')
          .join('roles', 'users.role_id', '=', 'roles.id')
          .where('users.id', empId)
          .andWhere('roles.name', 'EMPLOYEE')
          .first();

        if (empUser) {
          await db('task_assignments').insert({
            task_id: createdTaskId,
            employee_id: empId,
          });

          // Email trigger
          await sendNotificationEmail({
            userId: empId,
            email: empUser.email,
            type: 'TASK_ASSIGNED',
            subject: `New Task Assignment: ${name}`,
            body: `Hi ${empUser.name}, you have been assigned to Task #${createdTaskId} ("${name}") under Project "${project.name}". Deadline is set for ${new Date(deadline).toLocaleString()}.`,
          });
        }
      }
    }

    const createdTask = await db('tasks').where('id', createdTaskId).first();
    const currentAssignees = await getTaskAssignees(createdTaskId);

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'TASK_CREATE',
      entityType: 'TASK',
      entityId: createdTaskId,
      newValue: { ...createdTask, assignees: currentAssignees.map(a => a.id) },
    });

    res.status(201).json({ ...createdTask, assignees: currentAssignees });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id (Admin: full, PM: assigned projects tasks, Employee: status update only)
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, priority, status, deadline, estimated_hours, assignees } = req.body;

    const task = await db('tasks').where('id', id).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get the project details to check management boundaries
    const project = await db('projects').where('id', task.project_id).first();

    if (req.user.role === 'EMPLOYEE') {
      // Employees can ONLY update status on their assigned tasks
      const assigned = await db('task_assignments')
        .where({ task_id: id, employee_id: req.user.id })
        .first();

      if (!assigned) {
        return res.status(403).json({ error: 'Forbidden: You can only update tasks assigned to you' });
      }

      if (!status) {
        return res.status(400).json({ error: 'Employees can only modify task status' });
      }

      const prevStatus = task.status;
      await db('tasks').where('id', id).update({ status });
      const updatedTask = await db('tasks').where('id', id).first();

      // Audit Logging
      await logAudit({
        userId: req.user.id,
        action: 'TASK_STATUS_UPDATE',
        entityType: 'TASK',
        entityId: Number(id),
        previousValue: { status: prevStatus },
        newValue: { status },
      });

      // Notify PM that employee updated status
      await sendNotificationEmail({
        userId: project.manager_id,
        email: await db('users').select('email').where('id', project.manager_id).first().then(u => u.email),
        type: 'TASK_STATUS_CHANGE_PM',
        subject: `Task Status Updated: ${task.name}`,
        body: `Hi, employee ${req.user.name} has updated the status of Task #${id} ("${task.name}") from "${prevStatus}" to "${status}".`,
      });

      return res.json({ ...updatedTask, assignees: await getTaskAssignees(id) });
    }

    // Project Manager boundary checks
    if (req.user.role === 'PROJECT_MANAGER' && project.manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify tasks of other managers projects' });
    }

    // Admins and PMs: Full update capability
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (deadline) updateData.deadline = new Date(deadline);
    if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours;

    const previousAssignees = await getTaskAssignees(id);

    if (Object.keys(updateData).length > 0) {
      await db('tasks').where('id', id).update(updateData);
    }

    // Sync assignments
    if (assignees && Array.isArray(assignees)) {
      // Remove previous assignments
      await db('task_assignments').where('task_id', id).delete();

      // Add new assignments
      for (const empId of assignees) {
        const empUser = await db('users')
          .select('users.id', 'users.email', 'users.name')
          .join('roles', 'users.role_id', '=', 'roles.id')
          .where('users.id', empId)
          .andWhere('roles.name', 'EMPLOYEE')
          .first();

        if (empUser) {
          await db('task_assignments').insert({
            task_id: id,
            employee_id: empId,
          });

          // Only send notification if they were not already assigned
          if (!previousAssignees.some(a => a.id === empId)) {
            await sendNotificationEmail({
              userId: empId,
              email: empUser.email,
              type: 'TASK_ASSIGNED',
              subject: `New Task Assignment: ${task.name}`,
              body: `Hi ${empUser.name}, you have been assigned to Task #${id} ("${task.name}") under Project "${project.name}".`,
            });
          }
        }
      }
    }

    const updatedTask = await db('tasks').where('id', id).first();
    const currentAssignees = await getTaskAssignees(id);

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'TASK_UPDATE',
      entityType: 'TASK',
      entityId: Number(id),
      previousValue: { ...task, assignees: previousAssignees.map(a => a.id) },
      newValue: { ...updatedTask, assignees: currentAssignees.map(a => a.id) },
    });

    res.json({ ...updatedTask, assignees: currentAssignees });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id (Admin: full, PM: assigned projects tasks)
router.delete('/:id', authenticate, checkRole(['ADMIN', 'PROJECT_MANAGER']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await db('tasks').where('id', id).first();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // PM Access Lock
    const project = await db('projects').where('id', task.project_id).first();
    if (req.user.role === 'PROJECT_MANAGER' && project.manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot delete tasks from other managers projects' });
    }

    const assignees = await getTaskAssignees(id);

    // Remove assignments (foreign key cascades, but manually log)
    await db('tasks').where('id', id).delete();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'TASK_DELETE',
      entityType: 'TASK',
      entityId: Number(id),
      previousValue: { ...task, assignees: assignees.map(a => a.id) },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id/history (Get audit log entries for task timeline)
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await db('tasks')
      .select('tasks.id', 'projects.manager_id as project_manager_id')
      .join('projects', 'tasks.project_id', '=', 'projects.id')
      .where('tasks.id', id)
      .first();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // RBAC access validation
    if (req.user.role === 'PROJECT_MANAGER' && task.project_manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Access restricted to assigned project managers' });
    }
    if (req.user.role === 'EMPLOYEE') {
      const assigned = await db('task_assignments')
        .where({ task_id: id, employee_id: req.user.id })
        .first();
      if (!assigned) {
        return res.status(403).json({ error: 'Forbidden: Access restricted to task assignees' });
      }
    }

    const logs = await db('audit_logs')
      .select('audit_logs.*', 'users.name as user_name', 'roles.name as user_role')
      .join('users', 'audit_logs.user_id', '=', 'users.id')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('audit_logs.entity_type', 'TASK')
      .andWhere('audit_logs.entity_id', id)
      .orderBy('audit_logs.timestamp', 'desc');

    const parsedLogs = logs.map(log => {
      let prevVal = null;
      let newVal = null;
      try { if (log.previous_value) prevVal = JSON.parse(log.previous_value); } catch (e) { prevVal = log.previous_value; }
      try { if (log.new_value) newVal = JSON.parse(log.new_value); } catch (e) { newVal = log.new_value; }
      return { ...log, previous_value: prevVal, new_value: newVal };
    });

    res.json(parsedLogs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
