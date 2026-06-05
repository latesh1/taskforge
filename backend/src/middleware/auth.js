const jwt = require('jsonwebtoken');
const { db } = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyrolebasedtaskmgmt2026';

/**
 * Authentication Middleware: Verify JWT and attach user object (with roles) to req.user
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token is missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user and join role
    const user = await db('users')
      .select('users.id', 'users.name', 'users.email', 'roles.name as role')
      .join('roles', 'users.role_id', '=', 'roles.id')
      .where('users.id', decoded.userId)
      .first();

    if (!user) {
      return res.status(401).json({ error: 'User not found or disabled' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication Error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * RBAC Authorization Middleware: Restrict access to specific roles
 * @param {string[]} allowedRoles Array of roles (e.g. ['ADMIN', 'PROJECT_MANAGER'])
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to ${allowedRoles.join(', ')}` });
    }

    next();
  };
}

module.exports = {
  authenticate,
  checkRole,
};
