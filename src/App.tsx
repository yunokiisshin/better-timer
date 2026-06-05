import { useState, useCallback, useRef, useEffect } from 'react';
import { useTimers } from './hooks/useTimers';
import { useSessions } from './hooks/useSessions';
import { useLinearSessions } from './hooks/useLinearSessions';
import { TimerCard } from './components/TimerCard';
import { SessionCard } from './components/SessionCard';
import { LinearSessionCard } from './components/LinearSessionCard';
import { TimelineStrip } from './components/TimelineStrip';
import { Sidebar } from './components/Sidebar';
import { AddTimerModal } from './components/AddTimerModal';
import { AddSessionModal } from './components/AddSessionModal';
import { AddLinearSessionModal } from './components/AddLinearSessionModal';
import type { TimerState, SessionState, LinearSessionState } from './types';
import { DEFAULT_SIZE, DEFAULT_SESSION_SIZE, DEFAULT_LINEAR_SESSION_SIZE } from './types';
import type { ParsedResult } from './utils/csv';
import { parseCSV } from './utils/csv';
import { DEFAULT_SETUP_CSV } from './utils/defaultSetup';
import { PRESET_COLORS } from './constants';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 210;

export default function App() {
  const { timers, start, pause, reset, remove, add, update, updatePosition, updateSize, reorder, setAll } = useTimers();
  const {
    sessions, startChild, pauseChild, resetChild, resetSession,
    removeSession, addSession, addChild, updateChild, removeChild, reorderChild,
    updateSessionPosition, updateSessionSize,
    clearAll: clearAllSessions, setAll: setAllSessions,
  } = useSessions();
  const {
    sessions: linearSessions,
    start: startLinear, pause: pauseLinear, reset: resetLinear, remove: removeLinear, add: addLinear,
    addTask, removeTask, updateTask, reorderTask, skipTask,
    updatePosition: updateLinearPosition, updateSize: updateLinearSize,
    clearAll: clearAllLinear, setAll: setAllLinear,
  } = useLinearSessions();
  const [showModal, setShowModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLinearSessionModal, setShowLinearSessionModal] = useState(false);

  // Canvas ref for viewport-aware card placement
  const canvasRef = useRef<HTMLDivElement>(null);

  const getNewCardPos = useCallback(() => {
    const canvas = canvasRef.current;
    const n = (timers.length + sessions.length + linearSessions.length) % 10;
    const cascade = n * 28;
    const base = canvas
      ? { x: canvas.scrollLeft + 40, y: canvas.scrollTop + 40 }
      : { x: 40, y: 40 };
    return { x: base.x + cascade, y: base.y + cascade };
  }, [timers.length, sessions.length, linearSessions.length]);

  // ── Resizable sidebar ──────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('better-timer-sidebar-width');
    return saved ? Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, parseInt(saved, 10))) : SIDEBAR_DEFAULT;
  });
  const [isResizing, setIsResizing]   = useState(false);
  const [resizeHover, setResizeHover] = useState(false);
  const resizeState = useRef({ active: false, startX: 0, startW: SIDEBAR_DEFAULT });

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    resizeState.current = { active: true, startX: e.clientX, startW: sidebarWidth };
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeState.current.active) return;
      const next = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, resizeState.current.startW + e.clientX - resizeState.current.startX),
      );
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!resizeState.current.active) return;
      resizeState.current.active = false;
      setIsResizing(false);
      localStorage.setItem('better-timer-sidebar-width', String(sidebarWidth));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  // sidebarWidth dep so onUp saves the latest value
  }, [sidebarWidth]);

  // ── CSV load ───────────────────────────────────────────────
  const handleLoadData = useCallback(
    (result: ParsedResult) => {
      const nextTimers: TimerState[] = result.timers.map((r, i) => ({
        id:       crypto.randomUUID(),
        name:     r.name,
        duration: r.duration,
        color:    r.color ?? PRESET_COLORS[i % PRESET_COLORS.length]!,
        position: r.x !== undefined && r.y !== undefined
          ? { x: r.x, y: r.y }
          : { x: 24 + (i % 3) * (DEFAULT_SIZE.w + 24), y: 24 + Math.floor(i / 3) * (DEFAULT_SIZE.h + 24) },
        size:    r.w !== undefined && r.h !== undefined ? { w: r.w, h: r.h } : { ...DEFAULT_SIZE },
        elapsed: 0,
        status:  'idle',
      }));
      setAll(nextTimers);

      const nextSessions: SessionState[] = result.sessions.map((s, i) => ({
        id:            crypto.randomUUID(),
        name:          s.name,
        totalDuration: s.totalDuration,
        color:         s.color ?? PRESET_COLORS[i % PRESET_COLORS.length]!,
        position:      s.x !== undefined && s.y !== undefined
          ? { x: s.x, y: s.y }
          : { x: 24 + (i % 2) * (DEFAULT_SESSION_SIZE.w + 24), y: 24 + Math.floor(i / 2) * (DEFAULT_SESSION_SIZE.h + 24) },
        size:     s.w !== undefined && s.h !== undefined ? { w: s.w, h: s.h } : { ...DEFAULT_SESSION_SIZE },
        status:   'idle',
        children: s.children.map((c, j) => ({
          id:       crypto.randomUUID(),
          name:     c.name,
          duration: c.duration,
          color:    c.color ?? PRESET_COLORS[j % PRESET_COLORS.length]!,
          elapsed:  0,
          status:   'idle',
        })),
      }));
      setAllSessions(nextSessions);

      const nextLinear: LinearSessionState[] = result.linearSessions.map((s, i) => ({
        id:       crypto.randomUUID(),
        name:     s.name,
        color:    s.color ?? PRESET_COLORS[i % PRESET_COLORS.length]!,
        tasks:    s.tasks.map(t => ({
          id:       crypto.randomUUID(),
          name:     t.name,
          duration: t.duration,
        })),
        elapsed:          0,
        status:           'idle' as LinearSessionState['status'],
        activeTaskIdx:    0,
        taskStartElapsed: [0],
        position: s.x !== undefined && s.y !== undefined
          ? { x: s.x, y: s.y }
          : { x: 24 + (i % 2) * (DEFAULT_LINEAR_SESSION_SIZE.w + 24), y: 24 + Math.floor(i / 2) * (DEFAULT_LINEAR_SESSION_SIZE.h + 24) },
        size: s.w !== undefined && s.h !== undefined ? { w: s.w, h: s.h } : { ...DEFAULT_LINEAR_SESSION_SIZE },
      }));
      setAllLinear(nextLinear);
    },
    [setAll, setAllSessions, setAllLinear],
  );

  // Load default setup on first-ever launch (all three storage keys absent)
  useEffect(() => {
    const neverUsed =
      localStorage.getItem('better-timer-v1') === null &&
      localStorage.getItem('better-timer-sessions-v1') === null &&
      localStorage.getItem('better-timer-linear-sessions-v1') === null;
    if (neverUsed) handleLoadData(parseCSV(DEFAULT_SETUP_CSV));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{
      display:         'flex',
      flexDirection:   'column',
      height:          '100vh',
      backgroundColor: 'var(--bg)',
      fontFamily:      '"Inter", system-ui, -apple-system, sans-serif',
      overflow:        'hidden',
      color:           'var(--text)',
    }}>
      <TimelineStrip timers={timers} sessions={sessions} linearSessions={linearSessions} onReorder={reorder} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          timers={timers}
          sessions={sessions}
          linearSessions={linearSessions}
          width={sidebarWidth}
          onAddTimer={() => setShowModal(true)}
          onAddSession={() => setShowSessionModal(true)}
          onAddLinearSession={() => setShowLinearSessionModal(true)}
          onLoadData={handleLoadData}
          onClearAll={() => { setAll([]); clearAllSessions(); clearAllLinear(); }}
        />

        {/* ── Resize handle ── */}
        <div
          onMouseDown={handleResizeMouseDown}
          onMouseEnter={() => setResizeHover(true)}
          onMouseLeave={() => setResizeHover(false)}
          style={{
            width:           8,
            flexShrink:      0,
            cursor:          'ew-resize',
            position:        'relative',
            zIndex:          20,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          {/* The visible indicator line */}
          <div style={{
            width:           2,
            height:          '100%',
            borderRadius:    99,
            backgroundColor: (resizeHover || isResizing) ? 'var(--border)' : 'transparent',
            transition:      'background-color 0.18s',
          }} />
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          style={{
            flex:             1,
            position:         'relative',
            overflow:         'auto',
            backgroundColor:  'var(--bg)',
            backgroundImage:  'radial-gradient(circle, var(--dot) 1px, transparent 1px)',
            backgroundSize:   '28px 28px',
            userSelect:       isResizing ? 'none' : 'auto',
          }}>
          {/* Transparent full-screen capture during resize so cards don't interfere */}
          {isResizing && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'ew-resize' }} />
          )}

          {/* Scrollable spacer */}
          <div style={{ minWidth: '250vw', minHeight: '250vh', pointerEvents: 'none' }} />

          {timers.map(timer => (
            <TimerCard
              key={timer.id}
              timer={timer}
              onStart={() => start(timer.id)}
              onPause={() => pause(timer.id)}
              onReset={() => reset(timer.id)}
              onDelete={() => remove(timer.id)}
              onUpdate={cfg => update(timer.id, cfg)}
              onUpdatePosition={pos => updatePosition(timer.id, pos)}
              onUpdateSize={size => updateSize(timer.id, size)}
            />
          ))}

          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onStartChild={childId => startChild(session.id, childId)}
              onPauseChild={childId => pauseChild(session.id, childId)}
              onResetChild={childId => resetChild(session.id, childId)}
              onResetSession={() => resetSession(session.id)}
              onDelete={() => removeSession(session.id)}
              onAddChild={cfg => addChild(session.id, cfg)}
              onUpdateChild={(childId, cfg) => updateChild(session.id, childId, cfg)}
              onRemoveChild={childId => removeChild(session.id, childId)}
              onReorderChild={(childId, targetId) => reorderChild(session.id, childId, targetId)}
              onUpdatePosition={pos => updateSessionPosition(session.id, pos)}
              onUpdateSize={size => updateSessionSize(session.id, size)}
            />
          ))}

          {linearSessions.map(session => (
            <LinearSessionCard
              key={session.id}
              session={session}
              onStart={() => startLinear(session.id)}
              onPause={() => pauseLinear(session.id)}
              onReset={() => resetLinear(session.id)}
              onDelete={() => removeLinear(session.id)}
              onSkipTask={() => skipTask(session.id)}
              onAddTask={cfg => addTask(session.id, cfg)}
              onUpdateTask={(taskId, cfg) => updateTask(session.id, taskId, cfg)}
              onRemoveTask={taskId => removeTask(session.id, taskId)}
              onReorderTask={(taskId, targetId) => reorderTask(session.id, taskId, targetId)}
              onUpdatePosition={pos => updateLinearPosition(session.id, pos)}
              onUpdateSize={size => updateLinearSize(session.id, size)}
            />
          ))}

          {timers.length === 0 && sessions.length === 0 && linearSessions.length === 0 && (
            <div style={{
              position:       'absolute',
              inset:          0,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            10,
              pointerEvents:  'none',
            }}>
              <div style={{ fontSize: 44, opacity: 0.12 }}>⏳</div>
              <p style={{
                margin:     0,
                color:      'var(--text-hint)',
                fontSize:   14,
                fontStyle:  'italic',
              }}>
                Add a timer or session from the sidebar
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AddTimerModal onAdd={cfg => add(cfg, getNewCardPos())} onClose={() => setShowModal(false)} />
      )}

      {showSessionModal && (
        <AddSessionModal onAdd={cfg => addSession(cfg, getNewCardPos())} onClose={() => setShowSessionModal(false)} />
      )}

      {showLinearSessionModal && (
        <AddLinearSessionModal onAdd={cfg => addLinear(cfg, getNewCardPos())} onClose={() => setShowLinearSessionModal(false)} />
      )}
    </div>
  );
}
