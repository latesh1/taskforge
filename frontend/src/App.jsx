import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FolderGit2, 
  CheckSquare, 
  History, 
  Users, 
  Mail, 
  LogOut, 
  Plus, 
  Eye, 
  Edit3, 
  Trash2, 
  MessageSquare, 
  Paperclip, 
  X, 
  Bell, 
  RefreshCw,
  Search,
  Key
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import KanbanBoard from './components/KanbanBoard';

export default function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // App navigation state
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, projects, tasks, logs, audit, users, emails

  // Data states
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [workLogs, setWorkLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [simulatedEmails, setSimulatedEmails] = useState([]);
  
  // Scoped reports stats
  const [reports, setReports] = useState({ projects: [], employees: [] });
  const [appStats, setAppStats] = useState({ employeeCount: 0 });

  // Filters state
  const [projFilterStatus, setProjFilterStatus] = useState('');
  const [projFilterManager, setProjFilterManager] = useState('');
  const [projFilterStartDate, setProjFilterStartDate] = useState('');
  const [projFilterEndDate, setProjFilterEndDate] = useState('');

  const [taskFilterStatus, setTaskFilterStatus] = useState('');
  const [taskFilterPriority, setTaskFilterPriority] = useState('');
  const [taskFilterAssignee, setTaskFilterAssignee] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  const [logFilterEmployee, setLogFilterEmployee] = useState('');
  const [logFilterProject, setLogFilterProject] = useState('');
  const [logFilterStartDate, setLogFilterStartDate] = useState('');
  const [logFilterEndDate, setLogFilterEndDate] = useState('');
  
  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logTaskId, setLogTaskId] = useState(null);
  
  const [isRepliesModalOpen, setIsRepliesModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [logReplies, setLogReplies] = useState([]);
  const [newReplyText, setNewReplyText] = useState('');
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Task details and timeline states
  const [isTaskDetailsOpen, setIsTaskDetailsOpen] = useState(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [taskHistory, setTaskHistory] = useState([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  // Form states
  const [projectForm, setProjectForm] = useState({ name: '', description: '', start_date: '', end_date: '', status: 'Planning', manager_id: '' });
  const [taskForm, setTaskForm] = useState({ name: '', description: '', priority: 'Medium', status: 'To Do', deadline: '', project_id: '', estimated_hours: 0, assignees: [] });
  const [logForm, setLogForm] = useState({ description: '', hours_worked: '', attachment: null });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role_id: 3 });

  // Fetch triggers
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Set auth header helper
  const authHeader = () => ({ 'Authorization': `Bearer ${token}` });

  // Load user data on startup/refresh
  useEffect(() => {
    if (!token) return;

    // Load projects
    fetch('/api/projects', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    // Load tasks
    fetch('/api/tasks', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    // Load work logs
    fetch('/api/work-logs', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => setWorkLogs(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    // Load notifications
    fetch('/api/notifications', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    // Load simulated emails
    fetch('/api/debug/emails')
      .then((res) => res.json())
      .then((data) => setSimulatedEmails(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err));

    // Load project reports
    fetch('/api/reports/projects', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => setReports(prev => ({ ...prev, projects: Array.isArray(data) ? data : [] })))
      .catch((err) => console.error(err));

    // Load employee productivity reports
    fetch('/api/reports/employees', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => setReports(prev => ({ ...prev, employees: Array.isArray(data) ? data : [] })))
      .catch((err) => console.error(err));

    // Load all employees list for dropdowns (PM can see Employees, Admin can see all users)
    fetch('/api/users', { headers: authHeader() })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAllUsers(data);
          // Set employee stats
          const employees = data.filter(u => u.role === 'EMPLOYEE');
          setAppStats({ employeeCount: employees.length });
        }
      })
      .catch((err) => console.error(err));

    // Load Audit Logs (Admin only)
    if (user && user.role === 'ADMIN') {
      fetch('/api/audit-logs', { headers: authHeader() })
        .then((res) => res.json())
        .then((data) => setAuditLogs(Array.isArray(data) ? data : []))
        .catch((err) => console.error(err));
    }
  }, [token, refreshTrigger]);

  // Setup interval to poll notifications & mock emails
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetch('/api/notifications', { headers: authHeader() })
        .then((res) => res.json())
        .then((data) => setNotifications(Array.isArray(data) ? data : []))
        .catch((err) => console.error(err));

      fetch('/api/debug/emails')
        .then((res) => res.json())
        .then((data) => setSimulatedEmails(Array.isArray(data) ? data : []))
        .catch((err) => console.error(err));
    }, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setActiveTab('dashboard');
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetSuccess('');
    setAuthError('');
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      setResetSuccess(data.message);
    } catch (err) {
      setAuthError('Failed to send password reset request.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: authHeader(),
      });
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error(err);
    }
  };

  // Mark a single notification as read
  const handleMarkSingleRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: authHeader(),
      });
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit new project
  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      const method = editingProject ? 'PUT' : 'POST';
      const endpoint = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      
      const res = await fetch(endpoint, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setIsProjectModalOpen(false);
      setEditingProject(null);
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This will permanently delete all associated tasks and work logs.')) return;
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit task (create/update)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const endpoint = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';

      const res = await fetch(endpoint, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(taskForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Task Status directly (for Kanban Board drag-and-drop)
  const handleUpdateTaskStatus = async (taskId, nextStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      console.error(err);
    }
  };

  // Log Hours Submission (with optional attachment)
  const handleSaveLog = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('task_id', logTaskId);
      formData.append('description', logForm.description);
      formData.append('hours_worked', logForm.hours_worked);
      if (logForm.attachment) {
        formData.append('attachment', logForm.attachment);
      }

      const res = await fetch('/api/work-logs', {
        method: 'POST',
        headers: authHeader(), // Content-type is boundary for multipart form data (managed by browser)
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setIsLogModalOpen(false);
      setLogForm({ description: '', hours_worked: '', attachment: null });
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // View Replies and conversation on a specific log
  const handleViewReplies = async (log) => {
    setSelectedLog(log);
    setNewReplyText('');
    try {
      const res = await fetch(`/api/work-logs/${log.id}/replies`, { headers: authHeader() });
      const data = await res.json();
      setLogReplies(Array.isArray(data) ? data : []);
      setIsRepliesModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit reply to log conversation
  const handleSaveReply = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/work-logs/${selectedLog.id}/replies`, {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply_text: newReplyText }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const reply = await res.json();
      setLogReplies(prev => [...prev, reply]);
      setNewReplyText('');
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // User Administration CRUD (Admin only)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : '/api/users';

      const res = await fetch(endpoint, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      setIsUserModalOpen(false);
      setEditingUser(null);
      setUserForm({ name: '', email: '', password: '', role_id: 3 });
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (uId) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      const res = await fetch(`/api/users/${uId}`, {
        method: 'DELETE',
        headers: authHeader(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setRefreshTrigger(p => p + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  // Open task details and fetch audit logs for history timeline
  const handleViewTask = async (task) => {
    setSelectedTaskDetails(task);
    setIsTaskDetailsOpen(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/history`, { headers: authHeader() });
      const data = await res.json();
      setTaskHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load task timeline history:', err);
    }
  };

  // Clear virtual outbox mails log
  const handleClearMails = async () => {
    try {
      await fetch('/api/debug/emails/clear', { method: 'POST' });
      setSimulatedEmails([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger manually deadline scanning (to see reminders immediately)
  const triggerDeadlineCheck = async () => {
    // For demonstration, we perform a request to a mock runner,
    // or notify user that the node-cron scheduler is actively scanning every 60 seconds
    alert('Deadlines scanner is active! The node-cron daemon is actively scanning dates every 60 seconds in the background.');
  };

  // Render Login & Password Reset view if not authenticated
  if (!token) {
    return (
      <div className="auth-page">
        <div className="glass-card auth-card animate-fadeIn">
          <div className="auth-header">
            <div className="auth-logo">💼</div>
            <h2 className="auth-title">TaskForge</h2>
            <p className="auth-subtitle">Role-Based Project Management</p>
          </div>

          {authError && (
            <div style={{ background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
              {authError}
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                  placeholder="name@company.com" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  placeholder="••••••••" 
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem 0 1.5rem 0' }}>
                <span 
                  onClick={() => setIsForgotPassword(true)} 
                  style={{ fontSize: '0.82rem', color: 'var(--color-planning)', cursor: 'pointer', fontWeight: '500' }}
                >
                  Forgot Password?
                </span>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Demo: admin@company.com / admin123
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Reset Password</h3>
              
              {resetSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-completed)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  {resetSuccess}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Verify Registered Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={resetEmail} 
                  onChange={(e) => setResetEmail(e.target.value)} 
                  placeholder="name@company.com" 
                  required 
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsForgotPassword(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Back to Login
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Request Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Filter scoped data
  const filteredProjects = projects.filter(p => {
    if (projFilterStatus && p.status !== projFilterStatus) return false;
    if (projFilterManager && p.manager_id !== Number(projFilterManager)) return false;
    if (projFilterStartDate && new Date(p.start_date) < new Date(projFilterStartDate)) return false;
    if (projFilterEndDate && new Date(p.end_date) > new Date(projFilterEndDate)) return false;
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (taskFilterStatus && t.status !== taskFilterStatus) return false;
    if (taskFilterPriority && t.priority !== taskFilterPriority) return false;
    if (taskFilterAssignee && !t.assignees.some(a => a.id === Number(taskFilterAssignee))) return false;
    if (taskSearch) {
      const matchName = t.name.toLowerCase().includes(taskSearch.toLowerCase());
      const matchDesc = t.description?.toLowerCase().includes(taskSearch.toLowerCase());
      return matchName || matchDesc;
    }
    return true;
  });

  const filteredWorkLogs = workLogs.filter(log => {
    if (logFilterEmployee && log.employee_id !== Number(logFilterEmployee)) return false;
    if (logFilterProject && log.project_id !== Number(logFilterProject)) return false;
    if (logFilterStartDate && new Date(log.created_at) < new Date(logFilterStartDate)) return false;
    if (logFilterEndDate && new Date(log.created_at) > new Date(logFilterEndDate)) return false;
    return true;
  });

  // Calculate unread notifications count
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-brand">
          💼 TaskForge
        </div>
        
        <ul className="sidebar-menu">
          <li 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </li>
          
          <li 
            className={`sidebar-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <FolderGit2 size={18} />
            <span>Projects</span>
          </li>
          
          <li 
            className={`sidebar-item ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <CheckSquare size={18} />
            <span>Tasks (Kanban)</span>
          </li>
          
          <li 
            className={`sidebar-item ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <History size={18} />
            <span>Work Logs</span>
          </li>

          {user && user.role === 'ADMIN' && (
            <>
              <li 
                className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={18} />
                <span>Users Panel</span>
              </li>
              
              <li 
                className={`sidebar-item ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                <Key size={18} />
                <span>Audit Trail</span>
              </li>
            </>
          )}

          <li 
            className={`sidebar-item ${activeTab === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveTab('emails')}
            style={{ position: 'relative' }}
          >
            <Mail size={18} />
            <span>Email Auditor</span>
            {simulatedEmails.length > 0 && (
              <span className="notif-badge" style={{ right: '10px', top: '12px' }}>
                {simulatedEmails.length}
              </span>
            )}
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', fontSize: '0.85rem' }}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="main-workspace">
        {/* Navbar */}
        <div className="top-navbar">
          <h2 className="navbar-title">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Workspace
          </h2>
          
          <div className="navbar-actions">
            {/* Run scanner shortcut */}
            <button onClick={triggerDeadlineCheck} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
              <RefreshCw size={14} />
              Deadlines Scan
            </button>

            {/* Notification bell drawer/icon */}
            <div 
              style={{ position: 'relative', cursor: 'pointer' }} 
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)} 
              title="Toggle notifications panel"
            >
              <Bell size={20} color={unreadNotifications > 0 ? 'var(--color-critical)' : 'var(--text-sub)'} />
              {unreadNotifications > 0 && (
                <span className="notif-badge">{unreadNotifications}</span>
              )}

              {isNotifDropdownOpen && (
                <div 
                  className="glass-card" 
                  onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking inside it
                   style={{
                    position: 'absolute',
                    top: '45px',
                    right: '0',
                    width: '340px',
                    zIndex: '999',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    cursor: 'default',
                    padding: '1.25rem',
                    textAlign: 'left',
                    background: '#0c1222', // Solid dark color matching theme backgrounds
                    border: '1px solid rgba(255, 255, 255, 0.15)', // Highly visible border outline
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.75)', // Strong drop shadow
                    borderRadius: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>System Notifications</span>
                    {unreadNotifications > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAllRead();
                        }} 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '6px' }}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {notifications.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                        No new notification alerts.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          style={{ 
                            padding: '0.6rem', 
                            borderRadius: '8px', 
                            background: n.is_read ? 'rgba(255, 255, 255, 0.01)' : 'rgba(95, 93, 236, 0.05)',
                            border: '1px solid',
                            borderColor: n.is_read ? 'var(--border-glass)' : 'var(--border-glass-active)',
                            fontSize: '0.78rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            <span style={{ fontWeight: '700', color: n.is_read ? 'inherit' : 'var(--color-planning)' }}>
                              {n.type.replace(/_/g, ' ')}
                            </span>
                            <span>{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                          <p style={{ color: 'var(--text-main)', lineHeight: '1.3' }}>{n.message}</p>
                          {!n.is_read && (
                            <span 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleMarkSingleRead(n.id);
                              }}
                              style={{ 
                                color: 'var(--color-active)', 
                                cursor: 'pointer', 
                                fontWeight: '700', 
                                alignSelf: 'flex-end',
                                fontSize: '0.72rem',
                                textDecoration: 'underline',
                                marginTop: '0.2rem'
                              }}
                            >
                              Mark as read
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace dynamic content */}
        <div className="workspace-content">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              currentUser={user} 
              stats={appStats} 
              reports={reports} 
              projects={projects}
              tasks={tasks}
              workLogs={workLogs}
            />
          )}

          {/* TAB 2: PROJECTS */}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="filter-strip" style={{ marginBottom: 0 }}>
                  <select 
                    className="form-control" 
                    style={{ width: '160px' }} 
                    value={projFilterStatus} 
                    onChange={e => setProjFilterStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>

                  {user.role === 'ADMIN' && (
                    <select 
                      className="form-control" 
                      style={{ width: '180px' }} 
                      value={projFilterManager} 
                      onChange={e => setProjFilterManager(e.target.value)}
                    >
                      <option value="">All Managers</option>
                      {allUsers.filter(u => u.role === 'PROJECT_MANAGER').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-sub)' }}>Start:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ width: '140px', padding: '0.45rem' }} 
                      value={projFilterStartDate} 
                      onChange={e => setProjFilterStartDate(e.target.value)} 
                    />
                    <span style={{ color: 'var(--text-sub)' }}>End:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ width: '140px', padding: '0.45rem' }} 
                      value={projFilterEndDate} 
                      onChange={e => setProjFilterEndDate(e.target.value)} 
                    />
                  </div>
                </div>
                
                {user.role === 'ADMIN' && (
                  <button 
                    onClick={() => {
                      setEditingProject(null);
                      setProjectForm({ name: '', description: '', start_date: '', end_date: '', status: 'Planning', manager_id: '' });
                      setIsProjectModalOpen(true);
                    }} 
                    className="btn btn-primary"
                  >
                    <Plus size={16} /> Add Project
                  </button>
                )}
              </div>

              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Project Name</th>
                      <th>Manager</th>
                      <th>Duration</th>
                      <th>Status</th>
                      {user.role !== 'EMPLOYEE' && <th style={{ textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No projects matching filter.</td>
                      </tr>
                    ) : (
                      filteredProjects.map((proj) => (
                        <tr key={proj.id}>
                          <td style={{ fontWeight: '600' }}>
                            <div>{proj.name}</div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                              {proj.description || 'No description'}
                            </span>
                          </td>
                          <td>{proj.manager_name || 'System Admin'}</td>
                          <td>
                            {new Date(proj.start_date).toLocaleDateString()} - {new Date(proj.end_date).toLocaleDateString()}
                          </td>
                          <td>
                            <span className={`badge-status status-${proj.status.toLowerCase()}`}>
                              {proj.status}
                            </span>
                          </td>
                          {user.role !== 'EMPLOYEE' && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button 
                                  onClick={() => {
                                    setEditingProject(proj);
                                    setProjectForm({
                                      name: proj.name,
                                      description: proj.description || '',
                                      start_date: proj.start_date.split('T')[0],
                                      end_date: proj.end_date.split('T')[0],
                                      status: proj.status,
                                      manager_id: proj.manager_id,
                                    });
                                    setIsProjectModalOpen(true);
                                  }} 
                                  className="btn btn-secondary" 
                                  style={{ padding: '0.45rem' }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                {user.role === 'ADMIN' && (
                                  <button 
                                    onClick={() => handleDeleteProject(proj.id)} 
                                    className="btn btn-danger" 
                                    style={{ padding: '0.45rem' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TASKS (KANBAN) */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="filter-strip">
                <div style={{ position: 'relative', flexGrow: 1, maxWidth: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ paddingLeft: '2.5rem' }} 
                    placeholder="Search tasks..." 
                    value={taskSearch}
                    onChange={e => setTaskSearch(e.target.value)}
                  />
                </div>

                <select 
                  className="form-control" 
                  style={{ width: '150px' }} 
                  value={taskFilterPriority} 
                  onChange={e => setTaskFilterPriority(e.target.value)}
                >
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>

                {user.role !== 'EMPLOYEE' && (
                  <select 
                    className="form-control" 
                    style={{ width: '160px' }} 
                    value={taskFilterAssignee} 
                    onChange={e => setTaskFilterAssignee(e.target.value)}
                  >
                    <option value="">All Assignees</option>
                    {allUsers.filter(u => u.role === 'EMPLOYEE').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}

                {user.role !== 'EMPLOYEE' && (
                  <button 
                    onClick={() => {
                      setEditingTask(null);
                      setTaskForm({ name: '', description: '', priority: 'Medium', status: 'To Do', deadline: '', project_id: '', estimated_hours: 0, assignees: [] });
                      setIsTaskModalOpen(true);
                    }} 
                    className="btn btn-primary" 
                    style={{ marginLeft: 'auto' }}
                  >
                    <Plus size={16} /> Add Task
                  </button>
                )}
              </div>

              <KanbanBoard 
                tasks={filteredTasks} 
                onUpdateTaskStatus={handleUpdateTaskStatus} 
                currentUser={user} 
                onViewTask={handleViewTask}
              />
            </div>
          )}

          {/* TAB 4: WORK LOGS */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-title)' }}>Logged Activities</h3>
                
                <div className="filter-strip" style={{ marginBottom: 0 }}>
                  {user.role !== 'EMPLOYEE' && (
                    <select 
                      className="form-control" 
                      style={{ width: '160px' }} 
                      value={logFilterEmployee} 
                      onChange={e => setLogFilterEmployee(e.target.value)}
                    >
                      <option value="">All Employees</option>
                      {allUsers.filter(u => u.role === 'EMPLOYEE').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  )}

                  <select 
                    className="form-control" 
                    style={{ width: '180px' }} 
                    value={logFilterProject} 
                    onChange={e => setLogFilterProject(e.target.value)}
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-sub)' }}>Start:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ width: '140px', padding: '0.45rem' }} 
                      value={logFilterStartDate} 
                      onChange={e => setLogFilterStartDate(e.target.value)} 
                    />
                    <span style={{ color: 'var(--text-sub)' }}>End:</span>
                    <input 
                      type="date" 
                      className="form-control" 
                      style={{ width: '140px', padding: '0.45rem' }} 
                      value={logFilterEndDate} 
                      onChange={e => setLogFilterEndDate(e.target.value)} 
                    />
                  </div>
                </div>
              </div>

              {/* Grid of logs cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {filteredWorkLogs.length === 0 ? (
                  <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                    No work logs found matching filter.
                  </div>
                ) : (
                  filteredWorkLogs.map((log) => (
                    <div key={log.id} className="glass-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: '700', color: 'var(--color-planning)' }}>{log.hours_worked} Hours Logged</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.75rem' }}>{log.description}</p>
                      
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.75rem', marginBottom: '1rem' }}>
                        <span>Task: {log.task_name}</span>
                        <span>Employee: {log.employee_name} ({log.employee_email})</span>
                        <span>Project: {log.project_name}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {log.attachment_path ? (
                          <a 
                            href={log.attachment_path} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-active)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '500' }}
                          >
                            <Paperclip size={12} /> View File Attachment
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No attachments</span>
                        )}

                        <button 
                          onClick={() => handleViewReplies(log)} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
                        >
                          <MessageSquare size={12} /> Conversation Thread
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Helper guide on how to log work */}
              {user.role === 'EMPLOYEE' && (
                <div className="glass-card" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                  <h4 style={{ marginBottom: '0.5rem' }}>💡 Tip for Employees</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-sub)' }}>
                    To submit a new work log, navigate to the <strong>Tasks (Kanban)</strong> tab, locate an active task assigned to you, and click on it. You will find a "Log Work Hours" shortcut directly inside the task details pane!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: USERS PANEL (Admin only) */}
          {activeTab === 'users' && user.role === 'ADMIN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({ name: '', email: '', password: '', role_id: 3 });
                    setIsUserModalOpen(true);
                  }} 
                  className="btn btn-primary"
                >
                  <Plus size={16} /> Add User Account
                </button>
              </div>

              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>System Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '600' }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge-status`} style={{
                            backgroundColor: u.role === 'ADMIN' ? 'rgba(167, 139, 250, 0.12)' : (u.role === 'PROJECT_MANAGER' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(52, 211, 153, 0.12)'),
                            color: u.role === 'ADMIN' ? '#a78bfa' : (u.role === 'PROJECT_MANAGER' ? 'var(--color-planning)' : 'var(--color-active)')
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button 
                              onClick={() => {
                                setEditingUser(u);
                                setUserForm({ name: u.name, email: u.email, password: '', role_id: u.role_id });
                                setIsUserModalOpen(true);
                              }} 
                              className="btn btn-secondary" 
                              style={{ padding: '0.45rem' }}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(u.id)} 
                              className="btn btn-danger" 
                              style={{ padding: '0.45rem' }}
                              disabled={u.id === user.id}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: AUDIT TRAIL (Admin only) */}
          {activeTab === 'audit' && user.role === 'ADMIN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="table-wrapper">
                <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '160px' }}>Timestamp</th>
                      <th>Initiator</th>
                      <th>Action</th>
                      <th>Target Entity</th>
                      <th>Modifications (Previous / New)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No audit logs recorded.</td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                          <td style={{ fontWeight: '600' }}>
                            {log.user_name}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.user_role}</div>
                          </td>
                          <td style={{ color: 'var(--accent)', fontWeight: '700' }}>{log.action}</td>
                          <td>
                            {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                          </td>
                          <td>
                            {log.previous_value && (
                              <div style={{ color: 'var(--color-critical)', fontStyle: 'italic', marginBottom: '0.2rem' }}>
                                <strong>Before:</strong> {JSON.stringify(log.previous_value)}
                              </div>
                            )}
                            {log.new_value && (
                              <div style={{ color: 'var(--color-completed)' }}>
                                <strong>After:</strong> {JSON.stringify(log.new_value)}
                              </div>
                            )}
                            {!log.previous_value && !log.new_value && (
                              <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: EMAIL AUDITOR */}
          {activeTab === 'emails' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem' }}>
                  Auditing simulated emails sent to employees/PMs for task reminders and overdue conditions.
                </p>
                <button onClick={handleClearMails} className="btn btn-secondary">
                  Clear Outbox Logs
                </button>
              </div>

              <div className="mail-viewer-container">
                {simulatedEmails.length === 0 ? (
                  <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Virtual Outbox is empty. Change a task deadline in the Kanban Board to trigger approaches, or wait for background tasks.
                  </div>
                ) : (
                  simulatedEmails.map((mail) => (
                    <div key={mail.id} className="glass-card mail-item">
                      <div className="mail-item-header">
                        <div><strong>To:</strong> {mail.email}</div>
                        <div><strong>Subject:</strong> {mail.subject}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}><strong>Sent at:</strong> {new Date(mail.timestamp).toLocaleString()}</div>
                      </div>
                      <div className="mail-item-body">
                        {mail.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- DIALOG MODALS --- */}
      
      {/* 1. Project Create/Edit Modal */}
      {isProjectModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3>{editingProject ? 'Edit Project' : 'Create New Project'}</h3>
              <button className="modal-close" onClick={() => setIsProjectModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProject}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={projectForm.name} 
                  onChange={e => setProjectForm(prev => ({ ...prev, name: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={projectForm.description} 
                  onChange={e => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={projectForm.start_date} 
                    onChange={e => setProjectForm(prev => ({ ...prev, start_date: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={projectForm.end_date} 
                    onChange={e => setProjectForm(prev => ({ ...prev, end_date: e.target.value }))} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-control" 
                    value={projectForm.status} 
                    onChange={e => setProjectForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assigned Project Manager</label>
                  <select 
                    className="form-control" 
                    value={projectForm.manager_id} 
                    onChange={e => setProjectForm(prev => ({ ...prev, manager_id: Number(e.target.value) }))}
                    required
                  >
                    <option value="">Select Manager</option>
                    {allUsers.filter(u => u.role === 'PROJECT_MANAGER').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Task Create/Edit Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3>{editingTask ? 'Edit Task Specifications' : 'Create Project Task'}</h3>
              <button className="modal-close" onClick={() => setIsTaskModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={taskForm.name} 
                  onChange={e => setTaskForm(prev => ({ ...prev, name: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Specification Description</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={taskForm.description} 
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select 
                    className="form-control" 
                    value={taskForm.priority} 
                    onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-control" 
                    value={taskForm.status} 
                    onChange={e => setTaskForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Task Deadline (Date & Time)</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={taskForm.deadline} 
                    onChange={e => setTaskForm(prev => ({ ...prev, deadline: e.target.value }))} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Hours</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    className="form-control" 
                    value={taskForm.estimated_hours} 
                    onChange={e => setTaskForm(prev => ({ ...prev, estimated_hours: Number(e.target.value) }))} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Host Project Link</label>
                  <select 
                    className="form-control" 
                    value={taskForm.project_id} 
                    onChange={e => setTaskForm(prev => ({ ...prev, project_id: Number(e.target.value) }))}
                    required
                    disabled={!!editingTask}
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assignee Employee</label>
                  <select 
                    className="form-control" 
                    value={taskForm.assignees[0] || ''} 
                    onChange={e => setTaskForm(prev => ({ ...prev, assignees: [Number(e.target.value)] }))}
                    required
                  >
                    <option value="">Select Employee</option>
                    {allUsers.filter(u => u.role === 'EMPLOYEE').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Specifications</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Log Hours Modal (Employee context trigger) */}
      {isLogModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3>Log Work Hours</h3>
              <button className="modal-close" onClick={() => setIsLogModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveLog}>
              <div className="form-group">
                <label className="form-label">Hours Spent</label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-control" 
                  value={logForm.hours_worked} 
                  onChange={e => setLogForm(prev => ({ ...prev, hours_worked: e.target.value }))} 
                  placeholder="e.g. 3.5" 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Progress Description</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={logForm.description} 
                  onChange={e => setLogForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your progress, milestones achieved..." 
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Optional Attachment (Image/PDF/Doc)</label>
                <input 
                  type="file" 
                  className="form-control" 
                  onChange={e => setLogForm(prev => ({ ...prev, attachment: e.target.files[0] }))} 
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsLogModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Log Discussion Replies Thread Modal */}
      {isRepliesModalOpen && selectedLog && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h3>Work Log Conversation</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Task: {selectedLog.task_name} | Log ID #{selectedLog.id}
                </span>
              </div>
              <button className="modal-close" onClick={() => setIsRepliesModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Original work log bubble */}
            <div className="log-bubble">
              <div className="log-bubble-header">
                <strong>{selectedLog.employee_name} ({selectedLog.employee_email})</strong>
                <span>{new Date(selectedLog.created_at).toLocaleString()}</span>
              </div>
              <p style={{ margin: '0.5rem 0' }}>{selectedLog.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-planning)', fontWeight: '600' }}>
                <span>Hours Logged: {selectedLog.hours_worked} hrs</span>
                {selectedLog.attachment_path && (
                  <a href={selectedLog.attachment_path} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-active)' }}>
                    Download Attachment
                  </a>
                )}
              </div>
            </div>

            {/* Replies List */}
            <div className="log-replies-list">
              <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Discussion History:</h4>
              {logReplies.length === 0 ? (
                <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No replies yet.</p>
              ) : (
                logReplies.map((reply) => (
                  <div key={reply.id} className="reply-item">
                    <div className="reply-header">
                      <span>{reply.user_name} ({reply.user_role})</span>
                      <span>{new Date(reply.created_at).toLocaleString()}</span>
                    </div>
                    <p>{reply.reply_text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSaveReply} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Add Reply Comment</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  value={newReplyText} 
                  onChange={e => setNewReplyText(e.target.value)} 
                  placeholder="Enter message to user..." 
                  required 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">Send Message</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. User Creation Modal (Admin only) */}
      {isUserModalOpen && user.role === 'ADMIN' && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User Credentials' : 'Create User Account'}</h3>
              <button className="modal-close" onClick={() => setIsUserModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={userForm.name} 
                  onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={userForm.email} 
                  onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password {editingUser ? '(leave blank to keep current)' : ''}</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={userForm.password} 
                  onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} 
                  required={!editingUser} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">System Access Clearance</label>
                <select 
                  className="form-control" 
                  value={userForm.role_id} 
                  onChange={e => setUserForm(prev => ({ ...prev, role_id: Number(e.target.value) }))}
                >
                  <option value={1}>ADMIN</option>
                  <option value={2}>PROJECT_MANAGER</option>
                  <option value={3}>EMPLOYEE</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Task Details & History Timeline Modal */}
      {isTaskDetailsOpen && selectedTaskDetails && (
        <div className="modal-overlay">
          <div className="glass-card modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.4rem' }}>{selectedTaskDetails.name}</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Task Specifications & Timeline Audit
                </span>
              </div>
              <button className="modal-close" onClick={() => setIsTaskDetailsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--text-sub)', marginBottom: '0.5rem' }}>Description</h4>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  {selectedTaskDetails.description || 'No description provided.'}
                </p>

                {/* Log Work Hours Shortcut Button */}
                {user.role === 'EMPLOYEE' && selectedTaskDetails.assignees?.some(a => a.id === user.id) && (
                  <div style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={() => {
                        setLogTaskId(selectedTaskDetails.id);
                        setLogForm({ description: '', hours_worked: '', attachment: null });
                        setIsLogModalOpen(true);
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                      <Plus size={14} /> Log Work Hours
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexColumn: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-sub)' }}>Project:</span>
                  <span style={{ fontWeight: '600' }}>{selectedTaskDetails.project_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-sub)' }}>Priority:</span>
                  <span className={`badge-status status-${selectedTaskDetails.priority.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem' }}>
                    {selectedTaskDetails.priority}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-sub)' }}>Status:</span>
                  <span className={`badge-status status-${selectedTaskDetails.status.replace(' ', '').toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem' }}>
                    {selectedTaskDetails.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-sub)' }}>Est. Hours:</span>
                  <span style={{ fontWeight: '600' }}>{selectedTaskDetails.estimated_hours} hrs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: 'var(--text-sub)' }}>Deadline:</span>
                  <span style={{ fontWeight: '600', color: new Date(selectedTaskDetails.deadline) < new Date() && selectedTaskDetails.status !== 'Completed' ? 'var(--color-critical)' : 'inherit' }}>
                    {new Date(selectedTaskDetails.deadline).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-sub)', display: 'block', marginBottom: '0.25rem' }}>Assignees:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {selectedTaskDetails.assignees?.map(a => (
                      <span key={a.id} className="badge-status" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }}>
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tabs: History Timeline vs Work Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
              
              {/* Timeline segment */}
              <div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={16} color="var(--accent)" />
                  History Timeline & State Changes
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {taskHistory.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity logs found for this task.</p>
                  ) : (
                    taskHistory.map((h, i) => (
                      <div key={h.id} style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', borderBottom: i < taskHistory.length - 1 ? '1px dashed var(--border-glass)' : 'none', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', minWidth: '130px' }}>{new Date(h.timestamp).toLocaleString()}</span>
                        <div style={{ flexGrow: 1 }}>
                          <strong>{h.user_name}</strong> ({h.user_role}): <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{h.action}</span>
                          {h.new_value && (
                            <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                              Details: {JSON.stringify(h.new_value)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Task Work Logs and Discussions thread */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={16} color="var(--color-active)" />
                  Work Logs & Review Discussion Thread
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {workLogs.filter(log => log.task_id === selectedTaskDetails.id).length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hours logged on this task yet.</p>
                  ) : (
                    workLogs.filter(log => log.task_id === selectedTaskDetails.id).map(log => (
                      <div key={log.id} className="reply-item" style={{ background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '0.4rem' }}>
                          <strong>{log.employee_name} ({log.employee_email})</strong>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p style={{ fontSize: '0.88rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{log.description}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                          <span style={{ color: 'var(--color-planning)', fontWeight: '600' }}>Logged: {log.hours_worked} hrs</span>
                          {log.attachment_path ? (
                            <a href={log.attachment_path} target="_blank" rel="noreferrer" style={{ color: 'var(--color-active)', textDecoration: 'underline' }}>
                              View Attachment
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>No attachment</span>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleViewReplies(log)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                          >
                            <MessageSquare size={10} /> View/Reply to Thread
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
