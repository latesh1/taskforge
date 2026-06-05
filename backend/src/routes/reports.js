const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { authenticate, checkRole } = require('../middleware/auth');

// GET /api/reports/projects (Admin: all, PM: managed projects only)
router.get('/projects', authenticate, checkRole(['ADMIN', 'PROJECT_MANAGER']), async (req, res, next) => {
  try {
    let projectsQuery = db('projects')
      .select('projects.id', 'projects.name', 'projects.status', 'users.name as manager_name')
      .join('users', 'projects.manager_id', '=', 'users.id');

    if (req.user.role === 'PROJECT_MANAGER') {
      projectsQuery = projectsQuery.where('projects.manager_id', req.user.id);
    }

    const projects = await projectsQuery;

    const report = await Promise.all(
      projects.map(async (project) => {
        const tasks = await db('tasks')
          .select('status')
          .where('project_id', project.id);

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'Completed').length;
        const pendingTasks = totalTasks - completedTasks;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          manager: project.manager_name,
          totalTasks,
          completedTasks,
          pendingTasks,
          completionRate,
        };
      })
    );

    res.json(report);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/employees (Admin: all employees, PM: only employees assigned to their projects)
router.get('/employees', authenticate, checkRole(['ADMIN', 'PROJECT_MANAGER']), async (req, res, next) => {
  try {
    let employeesQuery = db('users')
      .select('users.id', 'users.name', 'users.email')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('roles.name', 'EMPLOYEE');

    if (req.user.role === 'PROJECT_MANAGER') {
      // Fetch only employees assigned to tasks inside this PM's projects
      const pmProjectIds = db('projects').select('id').where('manager_id', req.user.id);
      const pmAssignedEmpIds = db('task_assignments')
        .select('employee_id')
        .join('tasks', 'task_assignments.task_id', '=', 'tasks.id')
        .whereIn('tasks.project_id', pmProjectIds);

      employeesQuery = employeesQuery.whereIn('users.id', pmAssignedEmpIds);
    }

    const employees = await employeesQuery;

    const report = await Promise.all(
      employees.map(async (emp) => {
        // Query assigned tasks count
        const assignedTasks = await db('task_assignments')
          .select('tasks.id', 'tasks.status', 'tasks.created_at', 'tasks.updated_at')
          .join('tasks', 'task_assignments.task_id', '=', 'tasks.id')
          .where('task_assignments.employee_id', emp.id);

        const totalAssigned = assignedTasks.length;
        const completedTasks = assignedTasks.filter(t => t.status === 'Completed');
        const completedCount = completedTasks.length;

        // Query total hours logged by employee
        const hoursLoggedResult = await db('work_logs')
          .sum('hours_worked as total_hours')
          .where('employee_id', emp.id)
          .first();
        const totalHours = Number(hoursLoggedResult.total_hours || 0);

        // Compute average completion time in hours
        let avgCompletionHours = 0;
        if (completedCount > 0) {
          const totalDuration = completedTasks.reduce((sum, task) => {
            const start = new Date(task.created_at);
            const end = new Date(task.updated_at);
            const durationMs = end - start;
            return sum + (durationMs / (1000 * 60 * 60)); // in hours
          }, 0);
          avgCompletionHours = Math.round((totalDuration / completedCount) * 10) / 10;
        }

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          totalAssigned,
          completedCount,
          pendingCount: totalAssigned - completedCount,
          totalHours,
          avgCompletionHours,
        };
      })
    );

    res.json(report);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
