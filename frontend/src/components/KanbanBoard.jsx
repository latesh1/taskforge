import React from 'react';
import { Calendar, User, Clock } from 'lucide-react';

const COLUMNS = [
  { id: 'To Do', name: 'To Do', color: '#fbbf24' },
  { id: 'In Progress', name: 'In Progress', color: '#60a5fa' },
  { id: 'In Review', name: 'In Review', color: '#a78bfa' },
  { id: 'Blocked', name: 'Blocked', color: '#f87171' },
  { id: 'Completed', name: 'Completed', color: '#10b981' },
];

export default function KanbanBoard({ tasks, onUpdateTaskStatus, currentUser, onViewTask }) {
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
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

        return (
          <div
            key={col.id}
            className="kanban-column"
            onDragOver={handleDragOver}
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
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  border: '1px dashed var(--border-glass)',
                  borderRadius: '12px'
                }}>
                  Drop tasks here
                </div>
              ) : (
                columnTasks.map((task) => {
                  const deadlineDate = new Date(task.deadline);
                  const isOverdue = deadlineDate < new Date() && task.status !== 'Completed';

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onViewTask(task)}
                      className="glass-card glass-card-interactive kanban-card"
                    >
                      <span className={`task-tag priority-${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      
                      <h4 className="kanban-card-title">{task.name}</h4>
                      <p className="kanban-card-desc">{task.description || 'No description provided.'}</p>

                      <div className="kanban-card-meta">
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
