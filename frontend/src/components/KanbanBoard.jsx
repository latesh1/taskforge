import React, { useState } from 'react';
import { Calendar, User, Clock, MessageSquare } from 'lucide-react';

const COLUMNS = [
  { id: 'To Do', name: 'To Do', color: '#fbbf24' },
  { id: 'In Progress', name: 'In Progress', color: '#60a5fa' },
  { id: 'In Review', name: 'In Review', color: '#a78bfa' },
  { id: 'Blocked', name: 'Blocked', color: '#f87171' },
  { id: 'Completed', name: 'Completed', color: '#10b981' },
];

export default function KanbanBoard({ tasks, onUpdateTaskStatus, currentUser, onViewTask, workLogs = [] }) {
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverCol(columnId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskIdStr = e.dataTransfer.getData('text/plain');
    if (!taskIdStr) return;

    const taskId = Number(taskIdStr);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check permissions: Employees can only drag tasks they are assigned to
    if (currentUser.role === 'EMPLOYEE') {
      const isAssigned = task.assignees.some((u) => u.id === currentUser.id);
      if (!isAssigned) {
        alert('You can only update tasks assigned to you.');
        return;
      }
    }

    if (task.status !== targetStatus) {
      await onUpdateTaskStatus(taskId, targetStatus);
    }
  };

  return (
    <div className="kanban-container">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.id);
        const isDraggingOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            className={`kanban-column ${isDraggingOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span
                  className="kanban-column-dot"
                  style={{ backgroundColor: col.color }}
                />
                <span>{col.name}</span>
              </div>
              <span className="kanban-column-count">{columnTasks.length}</span>
            </div>

            <div className="kanban-column-body">
              {columnTasks.length === 0 ? (
                <div 
                  className="kanban-drop-zone"
                  style={{
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    border: isDraggingOver ? '1.5px dashed var(--accent)' : '1.5px dashed var(--border-glass)',
                    borderRadius: '12px',
                    transition: 'all 0.2s ease',
                    background: isDraggingOver ? 'rgba(99, 102, 241, 0.04)' : 'transparent'
                  }}
                >
                  {isDraggingOver ? 'Drop to update status' : 'Drop tasks here'}
                </div>
              ) : (
                columnTasks.map((task) => {
                  const deadlineDate = new Date(task.deadline);
                  const isOverdue = deadlineDate < new Date() && task.status !== 'Completed';

                  // Calculate task hours and logs metrics
                  const taskLogs = workLogs.filter((log) => log.task_id === task.id);
                  const totalHoursLogged = taskLogs.reduce((sum, log) => sum + Number(log.hours_worked), 0);
                  const logsCount = taskLogs.length;

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onViewTask(task)}
                      className={`glass-card glass-card-interactive kanban-card ${isOverdue ? 'overdue' : ''}`}
                    >
                      <span className={`task-tag priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      
                      <h4 className="kanban-card-title">{task.name}</h4>
                      <p className="kanban-card-desc">{task.description || 'No description provided.'}</p>

                      {/* Display task comment thread & hours count if present */}
                      {(logsCount > 0 || totalHoursLogged > 0) && (
                        <div className="kanban-card-metrics">
                          {logsCount > 0 && (
                            <span className="kanban-card-metric-item active" title={`${logsCount} work logs recorded`}>
                              <MessageSquare size={12} style={{ display: 'inline' }} />
                              <span>{logsCount} log{logsCount > 1 ? 's' : ''}</span>
                            </span>
                          )}
                          {totalHoursLogged > 0 && (
                            <span className="kanban-card-metric-item" title={`${totalHoursLogged} hours logged so far`}>
                              <Clock size={12} style={{ display: 'inline' }} />
                              <span>{totalHoursLogged}h logged</span>
                            </span>
                          )}
                        </div>
                      )}

                      <div className="kanban-card-meta" style={{ marginTop: (logsCount > 0 || totalHoursLogged > 0) ? '0.55rem' : '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--color-critical)' : 'inherit' }}>
                          <Calendar size={12} />
                          <span style={{ fontWeight: isOverdue ? '600' : 'normal' }}>
                            {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        
                        <div className="kanban-card-avatars">
                          {task.assignees && task.assignees.map((assignee) => (
                            <div
                              key={assignee.id}
                              className="kanban-card-avatar"
                              title={assignee.name}
                            >
                              {assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                          ))}
                          {(!task.assignees || task.assignees.length === 0) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
