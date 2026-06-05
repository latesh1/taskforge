const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/db');
const { authenticate, checkRole } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

// GET all users (Admin: all, PM: only Employees)
router.get('/', authenticate, checkRole(['ADMIN', 'PROJECT_MANAGER']), async (req, res, next) => {
  try {
    let query = db('users')
      .select('users.id', 'users.name', 'users.email', 'roles.name as role', 'users.role_id', 'users.created_at')
      .join('roles', 'users.role_id', '=', 'roles.id');

    if (req.user.role === 'PROJECT_MANAGER') {
      // PMs can only list employees
      query = query.where('roles.name', 'EMPLOYEE');
    }

    const users = await query;
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST create user (Admin only)
router.post('/', authenticate, checkRole(['ADMIN']), async (req, res, next) => {
  try {
    const { name, email, password, role_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ error: 'All fields (name, email, password, role_id) are required' });
    }

    // Check email uniqueness
    const existing = await db('users').where({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [newId] = await db('users').insert({
      name,
      email,
      password_hash,
      role_id,
    }).returning('id');

    const createdId = newId.id || newId;

    const createdUser = await db('users')
      .select('users.id', 'users.name', 'users.email', 'roles.name as role', 'users.role_id')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('users.id', createdId)
      .first();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'USER_CREATE',
      entityType: 'USER',
      entityId: createdId,
      newValue: { name, email, role_id },
    });

    res.status(201).json(createdUser);
  } catch (err) {
    next(err);
  }
});

// PUT update user (Admin only)
router.put('/:id', authenticate, checkRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role_id } = req.body;

    const existingUser = await db('users').where({ id }).first();
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) {
      // Check email uniqueness
      const emailCheck = await db('users').where({ email }).andWhereNot({ id }).first();
      if (emailCheck) {
        return res.status(400).json({ error: 'Email is already taken by another user' });
      }
      updateFields.email = email;
    }
    if (password) {
      updateFields.password_hash = await bcrypt.hash(password, 10);
    }
    if (role_id) updateFields.role_id = role_id;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    await db('users').where({ id }).update(updateFields);

    const updatedUser = await db('users')
      .select('users.id', 'users.name', 'users.email', 'roles.name as role', 'users.role_id')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('users.id', id)
      .first();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'USER_UPDATE',
      entityType: 'USER',
      entityId: Number(id),
      previousValue: { name: existingUser.name, email: existingUser.email, role_id: existingUser.role_id },
      newValue: { name: updatedUser.name, email: updatedUser.email, role_id: updatedUser.role_id },
    });

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// DELETE user (Admin only)
router.delete('/:id', authenticate, checkRole(['ADMIN']), async (req, res, next) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const existingUser = await db('users').where({ id }).first();
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await db('users').where({ id }).delete();

    // Audit Logging
    await logAudit({
      userId: req.user.id,
      action: 'USER_DELETE',
      entityType: 'USER',
      entityId: Number(id),
      previousValue: { name: existingUser.name, email: existingUser.email, role_id: existingUser.role_id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
