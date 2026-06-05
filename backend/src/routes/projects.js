const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { authenticate, checkRole } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// GET /api/projects (with status, manager, start/end date filters)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, managerId, startDate, endDate } = req.query;

    let query = db('projects')
      .select('projects.*', 'users.name as manager_name', 'users.email as manager_email')
      .join('users', 'projects.manager_id', '=', 'users.id');

    // Role-based scoping
    if (req.user.role === 'PROJECT_MANAGER') {
      // PM can only view their assigned projects
      query = query.where('projects.manager_id', req.user.id);
    } else if (req.user.role === 'EMPLOYEE') {
      // Employee can only view projects they have assigned tasks on
      const employeeProjectIds = db('tasks')
        .select('project_id')
        .join('task_assignments', 'tasks.id', '=', 'task_assignments.task_id')
        .where('task_assignments.employee_id', req.user.id);
        
      query = query.whereIn('projects.id', employeeProjectIds);
    }

    // Apply Filters
    if (status) {
      query = query.where('projects.status', status);
    }
    if (managerId && req.user.role === 'ADMIN') {
      query = query.where('projects.manager_id', managerId);
    }
    if (startDate) {
      query = query.where('projects.start_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('projects.end_date', '<=', endDate);
    }

    const projects = await query.orderBy('projects.created_at', 'desc');
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects (Admin only)
router.post('/', authenticate, checkRole(['ADMIN']), async (req, res, next) => {
  try {
    const { name, description, start_date, end_date, status, manager_id } = req.body;

    if (!name || !start_date || !end_date || !manager_id) {
      return res.status(400).json({ error: 'Project Name, Start Date, End Date, and Project Manager are required.' });
    }

    // Verify manager_id is a Project Manager
    const manager = await db('users')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('users.id', manager_id)
      .andWhere('roles.name', 'PROJECT_MANAGER')
      .first();

    if (!manager) {
      return res.status(400).json({ error: 'Assigned manager must be a valid Project Manager' });
    }

    const [newId] = await db('projects').insert({
      name,
      description,
      start_date,
      end_date,
      status: status || 'Planning',
      manager_id,
    }).returning('id');

    const createdId = newId.id || newId;

    const newProject = await db('projects').where('id', createdId).first();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'PROJECT_CREATE',
      entityType: 'PROJECT',
      entityId: createdId,
      newValue: newProject,
    });

    res.status(201).json(newProject);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id (Admin: full, PM: assigned projects only)
router.put('/:id', authenticate, checkRole(['ADMIN', 'PROJECT_MANAGER']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, start_date, end_date, status, manager_id } = req.body;

    const project = await db('projects').where({ id }).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // PM Access Lock
    if (req.user.role === 'PROJECT_MANAGER' && project.manager_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify projects assigned to other managers' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (status) updateData.status = status;

    // PM restriction: cannot change manager
    if (manager_id && req.user.role === 'ADMIN') {
      const manager = await db('users')
        .join('roles', 'users.role_id', '=', 'roles.id')
        .where('users.id', manager_id)
        .andWhere('roles.name', 'PROJECT_MANAGER')
        .first();

      if (!manager) {
        return res.status(400).json({ error: 'Assigned manager must be a valid Project Manager' });
      }
      updateData.manager_id = manager_id;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    await db('projects').where({ id }).update(updateData);

    const updatedProject = await db('projects').where({ id }).first();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'PROJECT_UPDATE',
      entityType: 'PROJECT',
      entityId: Number(id),
      previousValue: project,
      newValue: updatedProject,
    });

    res.json(updatedProject);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id (Admin only)
router.delete('/:id', authenticate, checkRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await db('projects').where({ id }).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // We cascade-delete tasks due to table foreign key constraint,
    // but we can log the project deletion audit
    await db('projects').where({ id }).delete();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'PROJECT_DELETE',
      entityType: 'PROJECT',
      entityId: Number(id),
      previousValue: project,
    });

    res.json({ message: 'Project and all associated tasks deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
