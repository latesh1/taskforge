import React from 'react';
import { 
  Folder, 
  CheckCircle, 
  Clock, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  Briefcase
} from 'lucide-react';

// ─── Custom Interactive SVG Donut Chart ───────────────────────
function TaskDonutChart({ tasks }) {
  const total = tasks.length;
  if (total === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No task data available.</p>;
  }

  const statuses = [
    { label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length, color: '#10b981' },
    { label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length, color: '#60a5fa' },
    { label: 'To Do', count: tasks.filter(t => t.status === 'To Do').length, color: '#fbbf24' },
    { label: 'In Review', count: tasks.filter(t => t.status === 'In Review').length, color: '#a78bfa' },
    { label: 'Blocked', count: tasks.filter(t => t.status === 'Blocked').length, color: '#f87171' },
  ].filter(s => s.count > 0);

  const radius = 52;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="65" cy="65" r={radius} fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth={strokeWidth} />
          {statuses.map((s, idx) => {
            const percentage = s.count / total;
            const dashArray = `${percentage * circumference} ${circumference}`;
            const dashOffset = currentOffset;
            currentOffset -= percentage * circumference;
            return (
              <circle
                key={idx}
                cx="65"
                cy="65"
                r={radius}
                fill="transparent"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="donut-segment"
              />
            );
          })}
        </svg>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-title)' }}>{total}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tasks</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1, minWidth: '140px' }}>
        {statuses.map((s, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color, display: 'inline-block' }} />
            <span style={{ fontWeight: '500', color: 'var(--text-sub)' }}>{s.label}</span>
            <span style={{ fontWeight: '700', marginLeft: 'auto' }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Custom SVG Horizontal Bar Chart ──────────────────────────
function ProductivityBarChart({ employees }) {
  if (!employees || employees.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>No productivity logs logged.</p>;
  }

  const data = employees.slice(0, 5);
  const maxHours = Math.max(...data.map(e => Number(e.totalHours || 0)), 5);
  const rowHeight = 32;
  const chartHeight = data.length * rowHeight;
  const maxBarWidth = 140; // max width in pixels

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <svg width="100%" height={chartHeight} viewBox={`0 0 280 ${chartHeight}`} preserveAspectRatio="xMinYMid meet">
        {data.map((emp, idx) => {
          const hours = Number(emp.totalHours || 0);
          const barWidth = maxHours > 0 ? (hours / maxHours) * maxBarWidth : 0;
          const y = idx * rowHeight;

          return (
            <g key={emp.id} className="svg-bar-row">
              <text x="0" y={y + 15} className="svg-bar-label" dominantBaseline="middle" style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                {emp.name.split(' ')[0]}
              </text>
              <rect x="90" y={y + 6} width={maxBarWidth} height="10" className="svg-bar-bg" />
              <rect
                x="90"
                y={y + 6}
                width={barWidth}
                height="10"
                fill="url(#dashboardBarGrad)"
                className="svg-bar-fill"
              />
              <text x={95 + barWidth} y={y + 15} className="svg-bar-value" dominantBaseline="middle" style={{ fontSize: '0.75rem', fontWeight: '700' }}>
                {hours}h
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="dashboardBarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--cyan)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function Dashboard({ currentUser, stats, reports, projects, tasks, workLogs }) {
  
  // 1. Admin Dashboard View
  if (currentUser.role === 'ADMIN') {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    
    // Check if task is overdue
    const overdueTasks = tasks.filter(t => {
      return new Date(t.deadline) < new Date() && t.status !== 'Completed';
    }).length;

    const activeEmployees = stats.employeeCount || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-planning)' }}>
              <Folder size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalProjects}</span>
              <span className="stat-label">Total Projects</span>
            </div>
          </div>
          
          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' }}>
              <Briefcase size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalTasks}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-completed)' }}>
              <CheckCircle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{completedTasks}</span>
              <span className="stat-label">Completed Tasks</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(248, 113, 113, 0.15)', color: 'var(--color-critical)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{overdueTasks}</span>
              <span className="stat-label">Overdue Tasks</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' }}>
              <Users size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{activeEmployees}</span>
              <span className="stat-label">Active Employees</span>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Analytics Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Donut Chart Widget */}
          <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.05rem' }}>
              <CheckCircle size={18} color="var(--accent)" />
              Task Status Distribution
            </h3>
            <div className="flex-center" style={{ flexGrow: 1 }}>
              <TaskDonutChart tasks={tasks} />
            </div>
          </div>

          {/* Project Progress Widget */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.05rem' }}>
              <TrendingUp size={18} color="var(--cyan)" />
              Project Progress Overview
            </h3>
            <div className="report-progress-container" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '0.4rem' }}>
              {reports.projects && reports.projects.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No projects available.</p>
              )}
              {reports.projects && reports.projects.map((proj) => (
                <div key={proj.id} className="report-progress-item">
                  <div className="report-progress-header">
                    <span>{proj.name}</span>
                    <span>{proj.completionRate}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${proj.completionRate}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Tasks: {proj.completedTasks} / {proj.totalTasks}</span>
                    <span>Manager: {proj.manager}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productivity Bar Chart Widget */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.05rem' }}>
              <Users size={18} color="var(--color-active)" />
              Productivity (Hours Logged)
            </h3>
            <ProductivityBarChart employees={reports.employees} />
            
            <div className="table-wrapper" style={{ marginTop: '1.25rem' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Tasks Finished</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.employees && reports.employees.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records logged.</td>
                    </tr>
                  )}
                  {reports.employees && reports.employees.slice(0, 3).map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: '600' }}>{emp.name}</td>
                      <td>{emp.completedCount} / {emp.totalAssigned}</td>
                      <td style={{ color: 'var(--color-planning)', fontWeight: '600' }}>{emp.totalHours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 2. Project Manager Dashboard View
  if (currentUser.role === 'PROJECT_MANAGER') {
    const managedProjectsCount = projects.length;
    const managedTasks = tasks;
    const activeTasksCount = managedTasks.filter(t => t.status !== 'Completed' && t.status !== 'Blocked').length;
    
    // Check upcoming deadlines (due within next 72 hours)
    const upcomingDeadlinesCount = managedTasks.filter(t => {
      const diff = new Date(t.deadline) - new Date();
      return diff > 0 && diff <= 72 * 60 * 60 * 1000 && t.status !== 'Completed';
    }).length;

    const totalHoursLogged = workLogs.reduce((sum, log) => sum + Number(log.hours_worked), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-planning)' }}>
              <Folder size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{managedProjectsCount}</span>
              <span className="stat-label">Managed Projects</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' }}>
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{activeTasksCount}</span>
              <span className="stat-label">Active Tasks</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(251, 146, 60, 0.15)', color: 'var(--color-high)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{upcomingDeadlinesCount}</span>
              <span className="stat-label">Upcoming Deadlines (72h)</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-completed)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalHoursLogged} hrs</span>
              <span className="stat-label">Total Logged Time</span>
            </div>
          </div>
        </div>

        {/* PM Progress Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card 1: Task Status Distribution */}
          <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.05rem' }}>
              <CheckCircle size={18} color="var(--accent)" />
              Task Statuses (Managed)
            </h3>
            <div className="flex-center" style={{ flexGrow: 1 }}>
              <TaskDonutChart tasks={tasks} />
            </div>
          </div>

          {/* Card 2: Project Work Progress */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem' }}>Project Work Progress</h3>
            <div className="report-progress-container" style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '0.4rem' }}>
              {reports.projects && reports.projects.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No assigned projects.</p>
              )}
              {reports.projects && reports.projects.map((proj) => (
                <div key={proj.id} className="report-progress-item">
                  <div className="report-progress-header">
                    <span>{proj.name}</span>
                    <span>{proj.completionRate}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${proj.completionRate}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Completed Tasks: {proj.completedTasks} / {proj.totalTasks}</span>
                    <span>Pending: {proj.pendingTasks}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Employee Productivity */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem' }}>Employee Productivity</h3>
            <ProductivityBarChart employees={reports.employees} />
            
            <div className="table-wrapper" style={{ marginTop: '1.25rem' }}>
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Tasks</th>
                    <th>Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.employees && reports.employees.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No employees assigned.</td>
                    </tr>
                  )}
                  {reports.employees && reports.employees.slice(0, 3).map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: '600' }}>{emp.name}</td>
                      <td>{emp.completedCount} / {emp.totalAssigned}</td>
                      <td style={{ color: 'var(--color-planning)', fontWeight: '600' }}>{emp.totalHours} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // 3. Employee Dashboard View
  if (currentUser.role === 'EMPLOYEE') {
    const assignedTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    
    // Check tasks due within 48h
    const dueSoonCount = tasks.filter(t => {
      const diff = new Date(t.deadline) - new Date();
      return diff > 0 && diff <= 48 * 60 * 60 * 1000 && t.status !== 'Completed';
    }).length;

    const totalHoursLogged = workLogs.reduce((sum, log) => sum + Number(log.hours_worked), 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--color-planning)' }}>
              <Folder size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{assignedTasksCount}</span>
              <span className="stat-label">Assigned Tasks</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-completed)' }}>
              <CheckCircle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{completedTasksCount}</span>
              <span className="stat-label">Completed Tasks</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(251, 146, 60, 0.15)', color: 'var(--color-high)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{dueSoonCount}</span>
              <span className="stat-label">Tasks Due Soon (48h)</span>
            </div>
          </div>

          <div className="glass-card stat-card">
            <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa' }}>
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalHoursLogged} hrs</span>
              <span className="stat-label">Total Hours Logged</span>
            </div>
          </div>
        </div>

        {/* Employee Dashboard Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card 1: Personal Task statuses */}
          <div className="glass-card flex-between" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1.05rem' }}>
              <CheckCircle size={18} color="var(--accent)" />
              Your Task Statuses
            </h3>
            <div className="flex-center" style={{ flexGrow: 1 }}>
              <TaskDonutChart tasks={tasks} />
            </div>
          </div>

          {/* Card 2: Active Task Queue */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem' }}>Your Active Task Queue</h3>
            <div className="table-wrapper">
              <table className="custom-table" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th>Task Name</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.filter(t => t.status !== 'Completed').length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                        All tasks completed! Good job.
                      </td>
                    </tr>
                  ) : (
                    tasks.filter(t => t.status !== 'Completed').slice(0, 4).map((t) => {
                      const dl = new Date(t.deadline);
                      const isOverdue = dl < new Date();
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: '600' }}>{t.name}</td>
                          <td>
                            <span className={`badge-status status-${t.status.replace(' ', '').toLowerCase()}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ color: isOverdue ? 'var(--color-critical)' : 'inherit', fontWeight: isOverdue ? '600' : 'normal' }}>
                            {dl.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Recent Activity Logs */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.05rem' }}>Recent Activity Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.4rem' }}>
              {workLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>No recent work logs recorded.</p>
              ) : (
                workLogs.slice(0, 3).map((log) => (
                  <div key={log.id} style={{ 
                    borderBottom: '1px solid var(--border-glass)', 
                    paddingBottom: '0.6rem',
                    fontSize: '0.82rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-planning)' }}>
                        Logged {log.hours_worked} hrs
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-sub)' }}>{log.description}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                      Task: {log.task_name}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return null;
}
