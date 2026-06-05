const knex = require('knex');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbClient = process.env.DB_CLIENT || 'sqlite3';
const isSqlite = dbClient === 'sqlite3';

const connectionConfig = isSqlite
  ? { filename: path.resolve(__dirname, '../../', process.env.DB_FILE || './src/db/dev.sqlite3') }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    };

const db = knex({
  client: dbClient,
  connection: connectionConfig,
  useNullAsDefault: isSqlite,
  pool: isSqlite ? undefined : { min: 2, max: 10 },
});

// Enable SQLite foreign keys
if (isSqlite) {
  db.raw('PRAGMA foreign_keys = ON;').then(() => {
    console.log('SQLite Foreign Keys Enabled.');
  });
}

/**
 * Automatically creates tables and seeds them if they do not exist.
 * This makes setup seamless for both local SQLite testing and MySQL deployments.
 */
async function initializeDatabase() {
  console.log(`Initializing database with client: ${dbClient}...`);

  // 1. Create Roles
  if (!(await db.schema.hasTable('roles'))) {
    await db.schema.createTable('roles', (table) => {
      table.increments('id').primary();
      table.string('name', 50).notNullable().unique();
    });
    console.log('Created table: roles');
  }

  // 2. Create Users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('email', 100).notNullable().unique();
      table.string('password_hash', 255).notNullable();
      table.integer('role_id').unsigned().notNullable()
        .references('id').inTable('roles').onDelete('RESTRICT');
      table.timestamps(true, true);
    });
    console.log('Created table: users');
  }

  // 3. Create Projects
  if (!(await db.schema.hasTable('projects'))) {
    await db.schema.createTable('projects', (table) => {
      table.increments('id').primary();
      table.string('name', 150).notNullable();
      table.text('description');
      table.date('start_date').notNullable();
      table.date('end_date').notNullable();
      table.string('status', 50).notNullable().defaultTo('Planning'); // Planning, Active, Completed, Archived
      table.integer('manager_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('RESTRICT');
      table.timestamps(true, true);
    });
    console.log('Created table: projects');
  }

  // 4. Create Tasks
  if (!(await db.schema.hasTable('tasks'))) {
    await db.schema.createTable('tasks', (table) => {
      table.increments('id').primary();
      table.string('name', 150).notNullable();
      table.text('description');
      table.string('priority', 50).notNullable().defaultTo('Medium'); // Low, Medium, High, Critical
      table.string('status', 50).notNullable().defaultTo('To Do'); // To Do, In Progress, In Review, Completed, Blocked
      table.datetime('deadline').notNullable();
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.decimal('estimated_hours', 10, 2).notNullable().defaultTo(0.00);
      table.integer('created_by').unsigned().notNullable()
        .references('id').inTable('users').onDelete('RESTRICT');
      table.timestamps(true, true);
    });
    console.log('Created table: tasks');
  }

  // 5. Create Task Assignments
  if (!(await db.schema.hasTable('task_assignments'))) {
    await db.schema.createTable('task_assignments', (table) => {
      table.increments('id').primary();
      table.integer('task_id').unsigned().notNullable()
        .references('id').inTable('tasks').onDelete('CASCADE');
      table.integer('employee_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('assigned_at').defaultTo(db.fn.now());
      table.unique(['task_id', 'employee_id']);
    });
    console.log('Created table: task_assignments');
  }

  // 6. Create Work Logs
  if (!(await db.schema.hasTable('work_logs'))) {
    await db.schema.createTable('work_logs', (table) => {
      table.increments('id').primary();
      table.integer('task_id').unsigned().notNullable()
        .references('id').inTable('tasks').onDelete('CASCADE');
      table.integer('employee_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.text('description').notNullable();
      table.decimal('hours_worked', 10, 2).notNullable();
      table.string('attachment_path', 255).defaultTo(null);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table: work_logs');
  }

  // 7. Create Log Replies
  if (!(await db.schema.hasTable('log_replies'))) {
    await db.schema.createTable('log_replies', (table) => {
      table.increments('id').primary();
      table.integer('log_id').unsigned().notNullable()
        .references('id').inTable('work_logs').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.text('reply_text').notNullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table: log_replies');
  }

  // 8. Create Notifications
  if (!(await db.schema.hasTable('notifications'))) {
    await db.schema.createTable('notifications', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('type', 50).notNullable();
      table.text('message').notNullable();
      table.boolean('is_read').notNullable().defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
    console.log('Created table: notifications');
  }

  // 9. Create Audit Logs
  if (!(await db.schema.hasTable('audit_logs'))) {
    await db.schema.createTable('audit_logs', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('action', 100).notNullable();
      table.string('entity_type', 50).notNullable();
      table.integer('entity_id').defaultTo(null);
      table.text('previous_value').defaultTo(null); // Will store JSON stringified data
      table.text('new_value').defaultTo(null);      // Will store JSON stringified data
      table.timestamp('timestamp').defaultTo(db.fn.now());
    });
    console.log('Created table: audit_logs');
  }

  // SEED INITIAL DATA IF ROLES OR USERS DO NOT EXIST
  const rolesCount = await db('roles').count('id as count').first();
  if (rolesCount.count === 0) {
    console.log('Seeding initial data...');
    // Seed Roles
    const [adminRole, pmRole, empRole] = await db('roles').insert([
      { id: 1, name: 'ADMIN' },
      { id: 2, name: 'PROJECT_MANAGER' },
      { id: 3, name: 'EMPLOYEE' }
    ]).returning('id');

    // Create Hashed Passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const pmHash = await bcrypt.hash('pm123', 10);
    const empHash = await bcrypt.hash('emp123', 10);

    // Seed Users
    const [adminId] = await db('users').insert({
      name: 'System Admin',
      email: 'admin@company.com',
      password_hash: adminHash,
      role_id: 1,
    }).returning('id');

    const [pm1Id] = await db('users').insert({
      name: 'Sarah Connor (PM)',
      email: 'pm1@company.com',
      password_hash: pmHash,
      role_id: 2,
    }).returning('id');

    const [pm2Id] = await db('users').insert({
      name: 'John Doe (PM)',
      email: 'pm2@company.com',
      password_hash: pmHash,
      role_id: 2,
    }).returning('id');

    const [emp1Id] = await db('users').insert({
      name: 'Alice Cooper',
      email: 'emp1@company.com',
      password_hash: empHash,
      role_id: 3,
    }).returning('id');

    const [emp2Id] = await db('users').insert({
      name: 'Bob Marley',
      email: 'emp2@company.com',
      password_hash: empHash,
      role_id: 3,
    }).returning('id');

    const [emp3Id] = await db('users').insert({
      name: 'Charlie Sheen',
      email: 'emp3@company.com',
      password_hash: empHash,
      role_id: 3,
    }).returning('id');

    // Seed sample projects
    const today = new Date();
    const futureDate = (days) => {
      const d = new Date();
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const [p1Id] = await db('projects').insert({
      name: 'Project Alpha (Website Redesign)',
      description: 'Overhaul the customer-facing landing page and add a modern CSS styling framework.',
      start_date: today.toISOString().split('T')[0],
      end_date: futureDate(15),
      status: 'Active',
      manager_id: pm1Id.id || pm1Id,
    }).returning('id');

    const [p2Id] = await db('projects').insert({
      name: 'Project Beta (API Authentication)',
      description: 'Secure all REST backend endpoints using JSON Web Tokens (JWT) and implement RBAC verification.',
      start_date: today.toISOString().split('T')[0],
      end_date: futureDate(5),
      status: 'Active',
      manager_id: pm2Id.id || pm2Id,
    }).returning('id');

    // Seed sample tasks
    const p1IdVal = p1Id.id || p1Id;
    const p2IdVal = p2Id.id || p2Id;
    const emp1IdVal = emp1Id.id || emp1Id;
    const emp2IdVal = emp2Id.id || emp2Id;
    const emp3IdVal = emp3Id.id || emp3Id;
    const pm1IdVal = pm1Id.id || pm1Id;
    const pm2IdVal = pm2Id.id || pm2Id;

    const [t1Id] = await db('tasks').insert({
      name: 'Create UI Wireframes',
      description: 'Draw up initial glassmorphic layout ideas and CSS styling structures.',
      priority: 'High',
      status: 'To Do',
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      project_id: p1IdVal,
      estimated_hours: 12,
      created_by: pm1IdVal,
    }).returning('id');

    const [t2Id] = await db('tasks').insert({
      name: 'Implement JWT Tokens',
      description: 'Code the /login validation routing, JWT generation, and verifying middleware logic.',
      priority: 'Critical',
      status: 'In Progress',
      deadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      project_id: p2IdVal,
      estimated_hours: 8,
      created_by: pm2IdVal,
    }).returning('id');

    const [t3Id] = await db('tasks').insert({
      name: 'Database Migration Testing',
      description: 'Test schema constraints, seed records, and clean foreign key bindings on MySQL.',
      priority: 'Medium',
      status: 'To Do',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      project_id: p2IdVal,
      estimated_hours: 6,
      created_by: pm2IdVal,
    }).returning('id');

    const t1IdVal = t1Id.id || t1Id;
    const t2IdVal = t2Id.id || t2Id;
    const t3IdVal = t3Id.id || t3Id;

    // Assign Tasks to Employees
    await db('task_assignments').insert([
      { task_id: t1IdVal, employee_id: emp1IdVal },
      { task_id: t2IdVal, employee_id: emp2IdVal },
      { task_id: t3IdVal, employee_id: emp3IdVal },
    ]);

    // Create a sample work log and PM reply
    const [wLogId] = await db('work_logs').insert({
      task_id: t2IdVal,
      employee_id: emp2IdVal,
      description: 'Completed basic token structure and authentication middleware.',
      hours_worked: 4.5,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    }).returning('id');

    const wLogIdVal = wLogId.id || wLogId;
    await db('log_replies').insert({
      log_id: wLogIdVal,
      user_id: pm2IdVal,
      reply_text: 'Excellent progress. Make sure to cover testing of unauthorized requests.',
    });

    console.log('Seeding completed successfully!');
  }
}

module.exports = {
  db,
  initializeDatabase,
};
