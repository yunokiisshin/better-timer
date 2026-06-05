import { useEffect, useRef, useState } from 'react';
import type { LinearSessionState } from '../types';

const MIN_W = 260, MAX_W = 580;
const MIN_H = 320, MAX_H = 800;

function fmt(secs: number): string {
  const s = Math.floor(Math.abs(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface Props {
  session: LinearSessionState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onSkipTask: () => void;
  onAddTask: (cfg: { name: string; duration: number }) => void;
  onUpdateTask: (taskId: string, cfg: { name: string; duration: number }) => void;
  onRemoveTask: (taskId: string) => void;
  onReorderTask: (taskId: string, targetId: string) => void;
  onUpdatePosition: (pos: { x: number; y: number }) => void;
  onUpdateSize: (size: { w: number; h: number }) => void;
}

export function LinearSessionCard({
  session, onStart, onPause, onReset, onDelete, onSkipTask,
  onAddTask, onUpdateTask, onRemoveTask, onReorderTask,
  onUpdatePosition, onUpdateSize,
}: Props) {
  const drag   = useRef({ active: false, startX: 0, startY: 0, startPX: 0, startPY: 0 });
  const resize = useRef({ active: false, startX: 0, startY: 0, startW: 0, startH: 0 });
  const posRef  = useRef(onUpdatePosition); posRef.current  = onUpdatePosition;
  const sizeRef = useRef(onUpdateSize);     sizeRef.current = onUpdateSize;

  // Task drag-to-reorder
  const [draggingTaskId, setDraggingTaskId]   = useState<string | null>(null);
  const taskActive         = useRef(false);
  const taskItemRefs       = useRef<Map<string, HTMLDivElement>>(new Map());
  const draggingTaskIdRef  = useRef<string | null>(null);
  draggingTaskIdRef.current = draggingTaskId;
  const reorderTaskRef = useRef(onReorderTask);
  reorderTaskRef.current = onReorderTask;

  // Add-task form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newH, setNewH] = useState('0');
  const [newM, setNewM] = useState('5');
  const [newS, setNewS] = useState('0');

  // Edit-task form
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editH, setEditH] = useState('0');
  const [editM, setEditM] = useState('5');
  const [editS, setEditS] = useState('0');

  const startEditTask = (taskId: string) => {
    const task = session.tasks.find(t => t.id === taskId);
    if (!task) return;
    setEditName(task.name);
    setEditH(String(Math.floor(task.duration / 3600)));
    setEditM(String(Math.floor((task.duration % 3600) / 60)));
    setEditS(String(task.duration % 60));
    setEditingTaskId(taskId);
  };

  const handleSaveTask = () => {
    if (!editingTaskId) return;
    const duration = (parseInt(editH) || 0) * 3600 + (parseInt(editM) || 0) * 60 + (parseInt(editS) || 0);
    if (!editName.trim() || duration <= 0) return;
    onUpdateTask(editingTaskId, { name: editName.trim(), duration });
    setEditingTaskId(null);
  };

  const handleAddTask = () => {
    const duration = (parseInt(newH) || 0) * 3600 + (parseInt(newM) || 0) * 60 + (parseInt(newS) || 0);
    if (!newName.trim() || duration <= 0) return;
    onAddTask({ name: newName.trim(), duration });
    setNewName(''); setNewH('0'); setNewM('5'); setNewS('0');
    setShowAddForm(false);
  };

  const handleDragMouseDown = (e: React.MouseEvent) => {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY,
                     startPX: session.position.x, startPY: session.position.y };
    e.preventDefault();
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    resize.current = { active: true, startX: e.clientX, startY: e.clientY,
                       startW: session.size.w, startH: session.size.h };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.current.active) {
        posRef.current({
          x: Math.max(0, drag.current.startPX + e.clientX - drag.current.startX),
          y: Math.max(0, drag.current.startPY + e.clientY - drag.current.startY),
        });
      }
      if (resize.current.active) {
        sizeRef.current({
          w: Math.max(MIN_W, Math.min(MAX_W, resize.current.startW + e.clientX - resize.current.startX)),
          h: Math.max(MIN_H, Math.min(MAX_H, resize.current.startH + e.clientY - resize.current.startY)),
        });
      }
    };
    const onUp = () => { drag.current.active = false; resize.current.active = false; };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!taskActive.current || !draggingTaskIdRef.current) return;
      let closestId: string | null = null;
      let closestDist = Infinity;
      taskItemRefs.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - center);
        if (dist < closestDist) { closestDist = dist; closestId = id; }
      });
      if (closestId && closestId !== draggingTaskIdRef.current) {
        reorderTaskRef.current(draggingTaskIdRef.current, closestId);
      }
    };
    const onUp = () => { taskActive.current = false; setDraggingTaskId(null); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Derived values
  const totalDuration = session.tasks.reduce((sum, t) => sum + t.duration, 0);
  const isRunning = session.status === 'running' || session.status === 'overtime';
  const isOvertime = session.elapsed >= totalDuration && totalDuration > 0;
  const activeIdx = session.activeTaskIdx;
  const taskStartElapsed: number[] = session.taskStartElapsed ?? [0];
  const canStart = session.tasks.length > 0;
  const canSkip = isRunning && activeIdx < session.tasks.length;

  // Progress bar: show how far through the schedule we are
  // Fill = proportion of total scheduled duration consumed so far
  const scheduledElapsed = (() => {
    // sum of scheduled durations of completed tasks + elapsed within active task
    let s = 0;
    for (let i = 0; i < activeIdx && i < session.tasks.length; i++) {
      s += session.tasks[i]!.duration;
    }
    if (activeIdx < session.tasks.length) {
      const taskStart = taskStartElapsed[activeIdx] ?? 0;
      const withinTask = session.elapsed - taskStart;
      s += Math.min(withinTask, session.tasks[activeIdx]!.duration);
    }
    return s;
  })();
  const progress = totalDuration > 0 ? Math.min(scheduledElapsed / totalDuration, 1) : 0;

  // Task boundary positions for progress bar markers (based on scheduled proportions)
  const boundaries: number[] = [];
  if (totalDuration > 0) {
    let acc = 0;
    for (let i = 0; i < session.tasks.length - 1; i++) {
      acc += session.tasks[i]!.duration;
      boundaries.push((acc / totalDuration) * 100);
    }
  }

  // Cumulative schedule debt = how much later the current task started vs its scheduled start
  const scheduledStartOfActive = (() => {
    let s = 0;
    for (let i = 0; i < activeIdx && i < session.tasks.length; i++) s += session.tasks[i]!.duration;
    return s;
  })();
  const cumulativeDelta = activeIdx > 0
    ? (taskStartElapsed[activeIdx] ?? 0) - scheduledStartOfActive
    : 0;
  const hasDebt = activeIdx > 0;

  const timeDisplay = isOvertime
    ? `+${fmt(session.elapsed - totalDuration)}`
    : totalDuration > 0
      ? fmt(totalDuration - session.elapsed)
      : '—';

  const statusLabel = session.status === 'idle' ? 'Ready'
    : session.status === 'running' ? 'Running'
    : session.status === 'paused'  ? 'Paused'
    : 'Overtime';

  const { w, h } = session.size;

  const numInput = (val: string, set: (v: string) => void) => (
    <input
      value={val}
      onChange={e => set(e.target.value)}
      style={{
        width: 36, border: '1px solid var(--border)', borderRadius: 6,
        padding: '4px 0', fontSize: 12, textAlign: 'center',
        backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
        fontVariantNumeric: 'tabular-nums',
      }}
    />
  );

  return (
    <div
      className="timer-card-appear"
      style={{
        position: 'absolute',
        left: session.position.x,
        top:  session.position.y,
        width: w,
        height: h,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface-raised)',
        borderRadius: 18,
        border: '1px solid var(--border)',
        boxShadow: isRunning
          ? `0 0 0 2px ${session.color}30, 0 8px 32px ${session.color}18, 0 2px 12px var(--shadow-md)`
          : `0 2px 14px var(--shadow-sm), 0 1px 4px rgba(0,0,0,0.04)`,
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleDragMouseDown}
        style={{
          backgroundColor: session.color,
          borderRadius: '17px 17px 0 0',
          padding: '10px 10px 10px 14px',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, letterSpacing: 1, flexShrink: 0 }}>⠿</span>
        <span style={{
          color: '#fff', fontWeight: 600, fontSize: 13, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em',
        }}>
          {session.name}
        </span>
        <span style={{
          color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0,
        }}>
          Session
        </span>
        <button
          onClick={onDelete}
          onMouseDown={e => e.stopPropagation()}
          style={{
            background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
            color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
            width: 22, height: 22, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 15, flexShrink: 0, lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* Progress section */}
      <div style={{
        padding: '14px 14px 12px',
        borderBottom: '1px solid var(--border-light)',
        flexShrink: 0,
      }}>
        {/* Segmented progress bar with task markers */}
        <div style={{ position: 'relative', height: 14, marginBottom: 8 }}>
          {/* Background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: 'var(--border-light)',
            borderRadius: 99,
          }} />
          {/* Fill */}
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${progress * 100}%`,
            backgroundColor: isOvertime ? '#c0533a' : session.color,
            borderRadius: 99,
            transition: 'width 0.9s linear, background-color 0.35s',
            opacity: session.status === 'idle' ? 0 : 1,
          }} />
          {/* Task boundary markers */}
          {boundaries.map((pct, i) => (
            <div key={i} style={{
              position: 'absolute', top: 0, bottom: 0,
              left: `${pct}%`,
              width: 2,
              backgroundColor: 'var(--surface-raised)',
              transform: 'translateX(-50%)',
              zIndex: 2,
            }} />
          ))}
        </div>

        {/* Time + status row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontSize: 10, color: 'var(--text-hint)',
            textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
          }}>
            {statusLabel}
            {session.tasks.length > 0 && session.status !== 'idle' && activeIdx < session.tasks.length && (
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {' · '}{session.tasks[activeIdx]!.name}
              </span>
            )}
          </span>
          <span style={{
            fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: isOvertime ? '#c0533a' : 'var(--text)',
            letterSpacing: '-0.5px',
          }}>
            {timeDisplay}
          </span>
        </div>

        {/* Cumulative schedule debt */}
        {hasDebt && (
          <div style={{ marginTop: 7 }}>
            {Math.abs(cumulativeDelta) <= 2 ? (
              <span style={{ fontSize: 10, color: 'var(--text-hint)', fontStyle: 'italic' }}>
                On schedule
              </span>
            ) : cumulativeDelta > 2 ? (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#c0533a',
                backgroundColor: '#c0533a1a', borderRadius: 6, padding: '2px 8px',
                display: 'inline-block',
              }}>
                {fmt(cumulativeDelta)} behind schedule
              </span>
            ) : (
              <span style={{
                fontSize: 10, fontWeight: 600, color: '#4a8a85',
                backgroundColor: '#4a8a851a', borderRadius: 6, padding: '2px 8px',
                display: 'inline-block',
              }}>
                {fmt(Math.abs(cumulativeDelta))} ahead of schedule
              </span>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '6px 8px',
        display: 'flex', flexDirection: 'column', gap: 2,
        minHeight: 0,
      }}>
        {session.tasks.length === 0 && !showAddForm && (
          <p style={{
            margin: 0, padding: '14px 0', textAlign: 'center',
            color: 'var(--text-hint)', fontSize: 12, fontStyle: 'italic',
          }}>
            No tasks yet — add one below
          </p>
        )}

        {session.tasks.map((task, idx) => {
          const isCompleted = idx < activeIdx;
          const isCurrent   = idx === activeIdx;
          const isPending   = idx > activeIdx;

          // Actual elapsed time for this task
          const taskStart = taskStartElapsed[idx] ?? 0;
          const taskActualElapsed = isCompleted
            ? (taskStartElapsed[idx + 1] ?? session.elapsed) - taskStart
            : isCurrent
              ? session.elapsed - taskStart
              : 0;

          // Delta vs schedule for completed tasks
          const taskDelta = isCompleted ? taskActualElapsed - task.duration : null;

          const taskOvertime = isCurrent && taskActualElapsed > task.duration;
          const taskPct = task.duration > 0 ? Math.min(taskActualElapsed / task.duration * 100, 100) : 0;

          const timeLabel = taskOvertime
            ? `+${fmt(taskActualElapsed - task.duration)}`
            : isCurrent
              ? fmt(Math.max(0, task.duration - taskActualElapsed))
              : fmt(task.duration);

          const isDragging = task.id === draggingTaskId;
          const isEditing  = task.id === editingTaskId;
          void isPending;

          return (
            <div
              key={task.id}
              ref={el => { if (el) taskItemRefs.current.set(task.id, el); else taskItemRefs.current.delete(task.id); }}
              style={{
                borderRadius: 10,
                backgroundColor: isEditing
                  ? 'var(--surface)'
                  : isDragging
                    ? 'var(--surface)'
                    : isCurrent
                      ? `${session.color}14`
                      : 'transparent',
                border: isEditing
                  ? '1px solid var(--border)'
                  : isCurrent && !isDragging
                    ? `1px solid ${session.color}40`
                    : '1px solid transparent',
                opacity: isDragging ? 0.55 : isCompleted && !isEditing ? 0.45 : 1,
                transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                transition: 'background-color 0.25s, border-color 0.25s, opacity 0.2s',
                overflow: 'hidden',
              }}
            >
              {isEditing ? (
                <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTask(); if (e.key === 'Escape') setEditingTaskId(null); }}
                    placeholder="Task name"
                    style={{
                      border: '1px solid var(--border)', borderRadius: 7,
                      padding: '6px 9px', fontSize: 13,
                      backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    {([{ val: editH, set: setEditH, label: 'h' },
                       { val: editM, set: setEditM, label: 'm' },
                       { val: editS, set: setEditS, label: 's' }] as const).map(({ val, set, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {numInput(val, set)}
                        <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setEditingTaskId(null)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        backgroundColor: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 7, color: 'var(--text-muted)', fontSize: 12,
                        padding: '6px 12px', cursor: 'pointer',
                      }}
                    >Cancel</button>
                    <button
                      onClick={handleSaveTask}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        flex: 1, backgroundColor: session.color,
                        border: 'none', borderRadius: 7,
                        color: '#fff', fontWeight: 600, fontSize: 12,
                        padding: '6px 0', cursor: 'pointer',
                      }}
                    >Save</button>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 10px',
                }}>
                  {/* Drag grip */}
                  <span
                    onMouseDown={e => {
                      e.stopPropagation();
                      taskActive.current = true;
                      setDraggingTaskId(task.id);
                      e.preventDefault();
                    }}
                    style={{
                      color: 'var(--text-hint)', fontSize: 11,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      flexShrink: 0, userSelect: 'none',
                    }}
                  >⠿</span>

                  {/* Status badge */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    backgroundColor: isCompleted
                      ? '#4a8a85'
                      : isCurrent
                        ? session.color
                        : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: isCompleted ? 11 : 9,
                    color: isCompleted || isCurrent ? '#fff' : 'var(--text-hint)',
                    fontWeight: 700,
                    transition: 'background-color 0.25s',
                  }}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>

                  {/* Name + bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: isCurrent ? 5 : 3 }}>
                      <span style={{
                        fontSize: 13,
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCompleted
                          ? 'var(--text-hint)'
                          : isCurrent
                            ? 'var(--text)'
                            : 'var(--text-muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        transition: 'color 0.2s',
                      }}>
                        {task.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexShrink: 0, marginLeft: 8 }}>
                        {/* Delta badge for completed tasks */}
                        {taskDelta !== null && Math.abs(taskDelta) > 1 && (
                          <span style={{
                            fontSize: 10, fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                            color: taskDelta > 0 ? '#c0533a' : '#4a8a85',
                            backgroundColor: taskDelta > 0 ? '#c0533a18' : '#4a8a8518',
                            borderRadius: 5, padding: '1px 5px',
                          }}>
                            {taskDelta > 0 ? '+' : '−'}{fmt(Math.abs(taskDelta))}
                          </span>
                        )}
                        <span style={{
                          fontSize: 12, fontVariantNumeric: 'tabular-nums',
                          color: taskOvertime ? '#c0533a' : isCurrent ? session.color : 'var(--text-hint)',
                        }}>
                          {timeLabel}
                        </span>
                      </div>
                    </div>
                    {isCurrent && (
                      <div style={{ height: 3, backgroundColor: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${taskPct}%`,
                          backgroundColor: taskOvertime ? '#c0533a' : session.color,
                          borderRadius: 99, transition: 'width 0.9s linear',
                        }} />
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={() => startEditTask(task.id)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        width: 28, height: 28,
                        backgroundColor: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 7, color: 'var(--text-hint)', cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✏</button>
                    <button
                      onClick={() => onRemoveTask(task.id)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        width: 24, height: 24,
                        backgroundColor: 'transparent', border: 'none',
                        borderRadius: 5, color: 'var(--text-hint)', cursor: 'pointer', fontSize: 15,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >×</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add task form */}
        {showAddForm && (
          <div style={{
            padding: '10px 10px 8px',
            border: '1px solid var(--border)',
            borderRadius: 10,
            backgroundColor: 'var(--surface)',
            display: 'flex', flexDirection: 'column', gap: 8,
            marginTop: 2,
          }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder="Task name"
              style={{
                border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 9px', fontSize: 12,
                backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {([{ val: newH, set: setNewH, label: 'h' },
                 { val: newM, set: setNewM, label: 'm' },
                 { val: newS, set: setNewS, label: 's' }] as const).map(({ val, set, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {numInput(val, set)}
                  <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowAddForm(false)}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  backgroundColor: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 7, color: 'var(--text-muted)', fontSize: 12,
                  padding: '6px 12px', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handleAddTask}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  flex: 1, backgroundColor: session.color,
                  border: 'none', borderRadius: 7,
                  color: '#fff', fontWeight: 600, fontSize: 12,
                  padding: '6px 0', cursor: 'pointer',
                }}
              >Add</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid var(--border-light)',
        display: 'flex',
        gap: 6,
        flexShrink: 0,
        alignItems: 'center',
      }}>
        <button
          onClick={isRunning ? onPause : onStart}
          onMouseDown={e => e.stopPropagation()}
          disabled={!canStart}
          style={{
            width: 36, height: 36,
            backgroundColor: canStart ? (isRunning ? session.color : 'var(--surface)') : 'transparent',
            border: `1px solid ${canStart ? (isRunning ? session.color : 'var(--border)') : 'var(--border-light)'}`,
            borderRadius: 10,
            color: isRunning ? '#fff' : 'var(--text-muted)',
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.2s, border-color 0.2s',
            opacity: canStart ? 1 : 0.35,
          }}
        >
          {isRunning ? '⏸' : '▶'}
        </button>
        <button
          onClick={onReset}
          onMouseDown={e => e.stopPropagation()}
          style={{
            width: 36, height: 36,
            backgroundColor: 'transparent', border: '1px solid var(--border)',
            borderRadius: 10, color: 'var(--text-hint)', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↺</button>
        <button
          onClick={onSkipTask}
          onMouseDown={e => e.stopPropagation()}
          disabled={!canSkip}
          title="End current task and move to next"
          style={{
            height: 36, padding: '0 12px',
            backgroundColor: canSkip ? 'var(--surface)' : 'transparent',
            border: `1px solid ${canSkip ? 'var(--border)' : 'var(--border-light)'}`,
            borderRadius: 10,
            color: canSkip ? 'var(--text-muted)' : 'var(--text-hint)',
            cursor: canSkip ? 'pointer' : 'not-allowed',
            fontSize: 12, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: canSkip ? 1 : 0.35,
            transition: 'background-color 0.15s, opacity 0.15s',
          }}
        >
          Next ⏭
        </button>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              flex: 1, height: 36,
              backgroundColor: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 10, color: 'var(--text-hint)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            ＋ Add task
          </button>
        )}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 24, height: 24, cursor: 'se-resize',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          padding: 5, color: 'var(--text-hint)', opacity: 0.45,
          borderRadius: '0 0 17px 0',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="9.5" cy="9.5" r="1.4" fill="currentColor" />
          <circle cx="5.5" cy="9.5" r="1.4" fill="currentColor" />
          <circle cx="9.5" cy="5.5" r="1.4" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
