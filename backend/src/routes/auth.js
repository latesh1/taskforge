const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/db');
const { logAudit } = require('../utils/auditLogger');
const { sendNotificationEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyrolebasedtaskmgmt2026';

// Login route
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user and join role
    const user = await db('users')
      .select('users.*', 'roles.name as role')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('users.email', email)
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    // Log to Audit Log
    await logAudit({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Password reset simulation
router.post('/password-reset', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      // Return 200 for security reasons, but skip emailing
      return res.json({ message: 'If the email exists, a password reset link has been sent.' });
    }

    // Simulate sending email
    await sendNotificationEmail({
      userId: user.id,
      email: user.email,
      type: 'PASSWORD_RESET',
      subject: 'Password Reset Request',
      body: `Hi ${user.name}, we received a request to reset your password. Please use this simulation link: http://localhost:5173/reset-password?token=mock_reset_token_${user.id} to reset it.`,
    });

    // Log to Audit Log
    await logAudit({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUEST',
      entityType: 'USER',
      entityId: user.id,
    });

    res.json({ message: 'If the email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
