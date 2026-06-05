const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

// Set port and SQLite database file for testing
process.env.PORT = '5055';
process.env.DB_FILE = './src/db/test.sqlite3';

// Require the server to boot it up
require('../index');

// Give the server 2 seconds to initialize the database and start listening
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('Integration Test Suite - REST API & RBAC', async (t) => {
  await sleep(2000); // Wait for boot
  
  const baseUrl = 'http://localhost:5055/api';
  let adminToken = '';
  let employeeToken = '';

  await t.test('1. Authentication - Successful Admin Login', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'admin123' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'ADMIN');
    adminToken = data.token;
  });

  await t.test('2. Authentication - Failed Login with Invalid Credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'wrongpassword' }),
    });

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.ok(data.error);
  });

  await t.test('3. Authentication - Successful Employee Login', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'emp1@company.com', password: 'emp123' }),
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.role, 'EMPLOYEE');
    employeeToken = data.token;
  });

  await t.test('4. RBAC Authorization - Employee cannot create Projects', async () => {
    const res = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({
        name: 'Forbidden Employee Project',
        start_date: '2026-06-01',
        end_date: '2026-06-30',
        manager_id: 2,
      }),
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Forbidden/);
  });

  await t.test('5. RBAC & Audit Logging - Admin can create Project and logs are audit recorded', async () => {
    const newProject = {
      name: 'Test Project Gamma',
      description: 'Audit log validation project.',
      start_date: '2026-06-05',
      end_date: '2026-06-20',
      status: 'Planning',
      manager_id: 2, // John Doe PM is ID 3, Sarah Connor is ID 2.
    };

    // 1. Create project
    const projRes = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(newProject),
    });

    assert.strictEqual(projRes.status, 201);
    const projData = await projRes.json();
    assert.ok(projData.id);

    // 2. Retrieve audit logs to check if the action was captured
    const auditRes = await fetch(`${baseUrl}/audit-logs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    assert.strictEqual(auditRes.status, 200);
    const logs = await auditRes.json();
    
    // Find the PROJECT_CREATE log
    const projectCreateLog = logs.find(log => log.action === 'PROJECT_CREATE' && log.entity_id === projData.id);
    assert.ok(projectCreateLog);
    assert.strictEqual(projectCreateLog.user_name, 'System Admin');
    assert.strictEqual(projectCreateLog.entity_type, 'PROJECT');
    assert.ok(projectCreateLog.new_value);
  });

  // Finish tests and exit programmatically
  console.log('All API tests passed successfully!');
  process.exit(0);
});
