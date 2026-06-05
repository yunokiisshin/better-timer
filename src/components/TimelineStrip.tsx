import { useState, useEffect, useRef } from 'react';
import type { TimerState, SessionState, LinearSessionState } from '../types';

function fmt(secs: number): string {
  const s = Math.floor(Math.abs(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface Props {
  timers: TimerState[];
  sessions: SessionState[];
  linearSessions: LinearSessionState[];
  onReorder: (id: string, targetId: string) => void;
}

export function TimelineStrip({ timers, sessions, linearSessions, onReorder }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const active = useRef(false);
  // Map from timer id → the rendered item element
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Keep a stable ref to onReorder so the effect closure never stales
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;

  // Keep a stable ref to the dragging id so the effect can read it
  const draggingIdRef = useRef<string | null>(null);
  draggingIdRef.current = draggingId;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!active.current || !draggingIdRef.current) return;

      // Find the item whose centre is closest to the cursor's X
      let closestId: string | null = null;
      let closestDist = Infinity;
      itemRefs.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(e.clientX - center);
        if (dist < closestDist) { closestDist = dist; closestId = id; }
      });

      if (closestId && closestId !== draggingIdRef.current) {
        reorderRef.current(draggingIdRef.current, closestId);
      }
    };

    const onUp = () => {
      active.current = false;
      setDraggingId(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent, id: string) => {
    active.current = true;
    setDraggingId(id);
    e.preventDefault();
  };

  const totalItems = timers.length + sessions.length + linearSessions.length;

  if (totalItems === 0) {
    return (
      <div style={{
        height: 52, backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px',
        color: 'var(--text-hint)', fontSize: 13, fontStyle: 'italic', flexShrink: 0,
      }}>
        Add timers or sessions from the sidebar to get started
      </div>
    );
  }

  return (
    <div style={{
      height: 52,
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: 10,
      overflowX: 'auto',
      flexShrink: 0,
      cursor: draggingId ? 'grabbing' : 'auto',
    }}>
      {/* Reorderable timer items */}
      {timers.map(t => {
        const pct = Math.min((t.elapsed / t.duration) * 100, 100);
        const isOvertime = t.status === 'overtime';
        const isDragging = t.id === draggingId;
        const remaining = isOvertime
          ? `+${fmt(t.elapsed - t.duration)}`
          : fmt(t.duration - t.elapsed);

        return (
          <div
            key={t.id}
            ref={el => {
              if (el) itemRefs.current.set(t.id, el);
              else itemRefs.current.delete(t.id);
            }}
            onMouseDown={e => startDrag(e, t.id)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 5,
              minWidth: 80, flex: 1, maxWidth: 220,
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: isDragging ? 0.6 : 1,
              transform: isDragging ? 'scale(1.03)' : 'scale(1)',
              transition: 'opacity 0.15s, transform 0.15s',
              padding: '2px 4px', borderRadius: 6,
              backgroundColor: isDragging ? 'var(--surface-raised)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: 'var(--text-hint)', fontSize: 9, marginRight: 4, letterSpacing: 0.5, flexShrink: 0 }}>⠿</span>
              <span style={{
                fontSize: 10, fontWeight: 500, color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {t.name}
              </span>
              <span style={{
                fontSize: 10, fontVariantNumeric: 'tabular-nums',
                color: isOvertime ? '#c0533a' : 'var(--text-hint)',
                flexShrink: 0, marginLeft: 6,
              }}>
                {remaining}
              </span>
            </div>
            <div style={{ height: 5, backgroundColor: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                backgroundColor: isOvertime ? '#c0533a' : t.color,
                borderRadius: 99, transition: 'width 0.9s linear, background-color 0.35s',
                opacity: t.status === 'idle' ? 0 : 1,
              }} />
            </div>
          </div>
        );
      })}

      {/* Non-reorderable nested timer items */}
      {sessions.map(s => {
        const totalElapsed = s.children.reduce((sum, c) => sum + c.elapsed, 0);
        const pct = s.totalDuration > 0 ? Math.min((totalElapsed / s.totalDuration) * 100, 100) : 0;
        const isOvertime = s.status === 'overtime';
        const remaining = isOvertime
          ? `+${fmt(totalElapsed - s.totalDuration)}`
          : fmt(s.totalDuration - totalElapsed);

        return (
          <div
            key={s.id}
            style={{
              display: 'flex', flexDirection: 'column', gap: 5,
              minWidth: 80, flex: 1, maxWidth: 220,
              padding: '2px 4px', borderRadius: 6,
              opacity: 0.85,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              {/* Session indicator instead of drag grip */}
              <span style={{ color: s.color, fontSize: 8, marginRight: 4, flexShrink: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>S</span>
              <span style={{
                fontSize: 10, fontWeight: 500, color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {s.name}
              </span>
              <span style={{
                fontSize: 10, fontVariantNumeric: 'tabular-nums',
                color: isOvertime ? '#c0533a' : 'var(--text-hint)',
                flexShrink: 0, marginLeft: 6,
              }}>
                {remaining}
              </span>
            </div>
            {/* Segmented bar showing each child's proportion */}
            <div style={{ height: 5, backgroundColor: 'var(--border-light)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
              {s.totalDuration > 0 && s.children.map(c => {
                const childPct = (c.duration / s.totalDuration) * 100;
                const childFill = c.duration > 0 ? Math.min(c.elapsed / c.duration * 100, 100) : 0;
                return (
                  <div key={c.id} style={{ width: `${childPct}%`, position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundColor: c.status === 'overtime' ? '#c0533a' : c.color,
                      opacity: c.status === 'idle' ? 0 : 1,
                      transform: `scaleX(${childFill / 100})`,
                      transformOrigin: 'left',
                      transition: 'transform 0.9s linear, opacity 0.2s',
                    }} />
                  </div>
                );
              })}
              {/* Fallback single bar if no children */}
              {s.children.length === 0 && (
                <div style={{
                  height: '100%', width: `${pct}%`,
                  backgroundColor: isOvertime ? '#c0533a' : s.color,
                  borderRadius: 99,
                }} />
              )}
            </div>
          </div>
        );
      })}
      {/* Non-reorderable linear session items */}
      {linearSessions.map(s => {
        const totalDuration = s.tasks.reduce((sum, t) => sum + t.duration, 0);
        const pct = totalDuration > 0 ? Math.min((s.elapsed / totalDuration) * 100, 100) : 0;
        const isOvertime = s.status === 'overtime';
        const remaining = isOvertime
          ? `+${fmt(s.elapsed - totalDuration)}`
          : totalDuration > 0
            ? fmt(totalDuration - s.elapsed)
            : '—';

        return (
          <div
            key={s.id}
            style={{
              display: 'flex', flexDirection: 'column', gap: 5,
              minWidth: 80, flex: 1, maxWidth: 220,
              padding: '2px 4px', borderRadius: 6,
              opacity: 0.85,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ color: s.color, fontSize: 8, marginRight: 4, flexShrink: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>▶</span>
              <span style={{
                fontSize: 10, fontWeight: 500, color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {s.name}
              </span>
              <span style={{
                fontSize: 10, fontVariantNumeric: 'tabular-nums',
                color: isOvertime ? '#c0533a' : 'var(--text-hint)',
                flexShrink: 0, marginLeft: 6,
              }}>
                {remaining}
              </span>
            </div>
            {/* Segmented bar with task boundaries */}
            <div style={{ height: 5, backgroundColor: 'var(--border-light)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: `${pct}%`,
                backgroundColor: isOvertime ? '#c0533a' : s.color,
                transition: 'width 0.9s linear',
                opacity: s.status === 'idle' ? 0 : 1,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
