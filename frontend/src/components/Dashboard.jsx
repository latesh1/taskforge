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

export default function Dashboard({ currentUser, stats, reports, projects, tasks, workLogs }) {
  
  // 1. Admin Dashboard View
  if (currentUser.role === 'ADMIN') {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    
    // Check if task is overdue (past deadline and not completed)
    const overdueTasks = tasks.filter(t => {
      return new Date(t.deadline) < new Date() && t.status !== 'Completed';
    }).length;

    // Active Employees count
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

        {/* Progress Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} color="var(--accent)" />
              Project Progress Overview
            </h3>
            <div className="report-progress-container">
              {reports.projects && reports.projects.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No projects available.</p>
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

          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} color="var(--accent)" />
              Top Productive Employees
            </h3>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Tasks Completed</th>
                    <th>Hours Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.employees && reports.employees.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No records logged.
                      </td>
                    </tr>
                  )}
                  {reports.employees && reports.employees.slice(0, 5).map((emp) => (
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

    // Total hours logged to this PM's projects
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

        {/* Project Progress Lists */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Project Work progress</h3>
            <div className="report-progress-container">
              {reports.projects && reports.projects.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No assigned projects.</p>
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

          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Employee Productivity (Managed Projects)</h3>
            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Tasks Finished</th>
                    <th>Avg Speed</th>
                    <th>Logged Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.employees && reports.employees.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No employees assigned to your projects.
                      </td>
                    </tr>
                  )}
                  {reports.employees && reports.employees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: '600' }}>{emp.name}</td>
                      <td>{emp.completedCount} / {emp.totalAssigned}</td>
                      <td>{emp.avgCompletionHours > 0 ? `${emp.avgCompletionHours}h` : 'N/A'}</td>
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

    // Total hours logged
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

        {/* Work Queues and Recent Logs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem' }}>Your Active Task Queue</h3>
            <div className="table-wrapper">
              <table className="custom-table">
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
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        All tasks completed! Good job.
                      </td>
                    </tr>
                  ) : (
                    tasks.filter(t => t.status !== 'Completed').slice(0, 5).map((t) => {
                      const dl = new Date(t.deadline);
                      const isOverdue = dl < new Date();
                      return (
                        <tr key={t.id}>
                          <td style={{ fontWeight: '600' }}>{t.name}</td>
                          <td>
                            <span className={`badge-status status-${t.status.replace(' ', '').toLowerCase()}`}>
                              {t.status}
                            </span>
                          </td>
                          <td style={{ color: isOverdue ? 'var(--color-critical)' : 'inherit', fontWeight: isOverdue ? '600' : 'normal' }}>
                            {dl.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ marginBottom: '1.25rem' }}>Recent Activity Logs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {workLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No recent work logs recorded.</p>
              ) : (
                workLogs.slice(0, 4).map((log) => (
                  <div key={log.id} style={{ 
                    borderBottom: '1px solid var(--border-glass)', 
                    paddingBottom: '0.75rem',
                    fontSize: '0.85rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--color-planning)' }}>
                        Logged {log.hours_worked} hrs
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-sub)' }}>{log.description}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
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
