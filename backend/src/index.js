const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initializeDatabase } = require('./db/db');
const { startScheduler } = require('./jobs/scheduler');

// Import routers
const authRouter = require('./routes/auth');
const projectRouter = require('./routes/projects');
const taskRouter = require('./routes/tasks');
const logRouter = require('./routes/workLogs');
const auditRouter = require('./routes/auditLogs');
const notificationRouter = require('./routes/notifications');
const reportRouter = require('./routes/reports');
const userRouter = require('./routes/users');
const debugRouter = require('./routes/debug');

const app = express();
const PORT = process.env.PORT || 5000;

// UPLOAD_DIR: if absolute path is given (Render persistent disk), use it directly
// otherwise resolve relative to the backend folder (local dev)
const rawUploadDir = process.env.UPLOAD_DIR || './uploads';
const UPLOAD_DIR = path.isAbsolute(rawUploadDir)
  ? rawUploadDir
  : path.resolve(__dirname, '../', rawUploadDir);

// Ensure attachments directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/work-logs', logRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reports', reportRouter);
app.use('/api/users', userRouter);
app.use('/api/debug', debugRouter);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDistPath));

  // Catch-all: send index.html for any non-API, non-upload route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.resolve(frontendDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected server error occurred.',
  });
});

// Initialize DB and start listening
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Start background cron scheduler
      startScheduler();
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database. Server cannot start.', err);
    process.exit(1);
  });
