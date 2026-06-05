import { useEffect, useRef, useState } from 'react';
import type { TimerState } from '../types';
import { CircularProgress } from './CircularProgress';
import { PRESET_COLORS } from '../constants';

// Card size bounds
const MIN_W = 152, MAX_W = 520;
const MIN_H = 228, MAX_H = 520;

function fmt(secs: number): string {
  const s = Math.floor(Math.abs(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// Arc fills the available vertical and horizontal space, capped at 280px
function calcArcSize(w: number, h: number) {
  const fromW = w - 32;      // 16px side padding × 2
  const fromH = h - 162;     // fixed chrome (header + padding + status + controls + gaps)
  return Math.max(80, Math.min(fromW, fromH, 280));
}

interface Props {
  timer: TimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDelete: () => void;
  onUpdate: (cfg: { name: string; duration: number; color: string }) => void;
  onUpdatePosition: (pos: { x: number; y: number }) => void;
  onUpdateSize: (size: { w: number; h: number }) => void;
}

export function TimerCard({
  timer, onStart, onPause, onReset, onDelete, onUpdate, onUpdatePosition, onUpdateSize,
}: Props) {
  const drag   = useRef({ active: false, startX: 0, startY: 0, startPX: 0, startPY: 0 });
  const resize = useRef({ active: false, startX: 0, startY: 0, startW: 0, startH: 0 });

  const [isEditing, setIsEditing]   = useState(false);
  const [editName, setEditName]     = useState('');
  const [editH, setEditH]           = useState('0');
  const [editM, setEditM]           = useState('5');
  const [editS, setEditS]           = useState('0');
  const [editColor, setEditColor]   = useState<string>(timer.color);

  const enterEdit = () => {
    setEditName(timer.name);
    setEditH(String(Math.floor(timer.duration / 3600)));
    setEditM(String(Math.floor((timer.duration % 3600) / 60)));
    setEditS(String(timer.duration % 60));
    setEditColor(timer.color);
    setIsEditing(true);
  };

  const handleSave = () => {
    const duration = (parseInt(editH) || 0) * 3600 + (parseInt(editM) || 0) * 60 + (parseInt(editS) || 0);
    if (!editName.trim() || duration <= 0) return;
    onUpdate({ name: editName.trim(), duration, color: editColor });
    setIsEditing(false);
  };

  // Stable refs so effects never go stale
  const posRef  = useRef(onUpdatePosition);  posRef.current  = onUpdatePosition;
  const sizeRef = useRef(onUpdateSize);       sizeRef.current = onUpdateSize;

  const handleDragMouseDown = (e: React.MouseEvent) => {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY,
                     startPX: timer.position.x, startPY: timer.position.y };
    e.preventDefault();
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    resize.current = { active: true, startX: e.clientX, startY: e.clientY,
                       startW: timer.size.w, startH: timer.size.h };
    e.preventDefault();
    e.stopPropagation(); // don't trigger drag
  };

  // One shared mousemove/mouseup listener for both drag and resize
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

  const { w, h } = timer.size;
  const arcSize = calcArcSize(w, h);
  const timeFontSize = Math.max(12, Math.round(arcSize * 0.15));

  const isOvertime = timer.status === 'overtime';
  const isActive   = timer.status === 'running' || isOvertime;
  const progress   = timer.duration > 0 ? timer.elapsed / timer.duration : 0;
  const displayTime = isOvertime
    ? `+${fmt(timer.elapsed - timer.duration)}`
    : fmt(timer.duration - timer.elapsed);

  const statusLabel =
    isOvertime             ? 'Overtime' :
    timer.status === 'running' ? 'Running'  :
    timer.status === 'paused'  ? 'Paused'   : 'Ready';

  return (
    <div
      className="timer-card-appear"
      style={{
        position: 'absolute',
        left:   timer.position.x,
        top:    timer.position.y,
        width:  w,
        height: h,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--surface-raised)',
        borderRadius: 18,
        border: '1px solid var(--border)',
        boxShadow: isActive
          ? `0 0 0 2px ${timer.color}30, 0 8px 32px ${timer.color}18, 0 2px 12px var(--shadow-md)`
          : `0 2px 14px var(--shadow-sm), 0 1px 4px rgba(0,0,0,0.04)`,
        userSelect: 'none',
        transition: 'box-shadow 0.4s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Coloured drag handle header ── */}
      <div
        onMouseDown={handleDragMouseDown}
        style={{
          backgroundColor: timer.color,
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
          {timer.name}
        </span>
        <button
          onClick={() => { isEditing ? setIsEditing(false) : enterEdit(); }}
          onMouseDown={e => e.stopPropagation()}
          title={isEditing ? 'Cancel edit' : 'Edit'}
          style={{
            background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
            color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
            width: 22, height: 22, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, flexShrink: 0, lineHeight: 1,
          }}
        >{isEditing ? '✕' : '✏'}</button>
        <button
          onClick={onDelete}
          onMouseDown={e => e.stopPropagation()}
          title="Remove"
          style={{
            background: 'rgba(0,0,0,0.15)', border: 'none', borderRadius: '50%',
            color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
            width: 22, height: 22, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 15, flexShrink: 0, lineHeight: 1,
          }}
        >×</button>
      </div>

      {/* ── Edit form (replaces body when editing) ── */}
      {isEditing ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '14px 16px 16px', gap: 12, overflow: 'hidden', minHeight: 0,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>Name</label>
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
              style={{
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '7px 10px', fontSize: 13,
                backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>Duration</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {([
                { val: editH, set: setEditH, label: 'h' },
                { val: editM, set: setEditM, label: 'm' },
                { val: editS, set: setEditS, label: 's' },
              ] as const).map(({ val, set, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <input
                    value={val}
                    onChange={e => set(e.target.value)}
                    style={{
                      width: 40, border: '1px solid var(--border)', borderRadius: 7,
                      padding: '6px 0', fontSize: 14, textAlign: 'center',
                      backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)' }}>Color</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  style={{
                    width: 22, height: 22, borderRadius: '50%', backgroundColor: c,
                    border: editColor === c ? '2.5px solid var(--text)' : '2.5px solid transparent',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                />
              ))}
              <input
                type="color"
                value={editColor}
                onChange={e => setEditColor(e.target.value)}
                style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent', flexShrink: 0 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', flexShrink: 0 }}>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                backgroundColor: 'transparent', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text-muted)', fontSize: 13,
                padding: '8px 14px', cursor: 'pointer',
              }}
            >Cancel</button>
            <button
              onClick={handleSave}
              style={{
                flex: 1, backgroundColor: editColor, border: 'none',
                borderRadius: 10, color: '#fff', fontWeight: 600,
                fontSize: 13, padding: '8px 0', cursor: 'pointer',
              }}
            >Save</button>
          </div>
        </div>
      ) : (
      <>
      {/* ── Flexible body ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 16px 16px',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Arc + status — fills all available height */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: 0,
          width: '100%',
        }}>
          {/* Arc with time overlay */}
          <div style={{ position: 'relative', width: arcSize, height: arcSize, flexShrink: 0 }}>
            <CircularProgress progress={progress} isOvertime={isOvertime} color={timer.color} size={arcSize} />
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: '"Inter", system-ui',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 700,
                fontSize: timeFontSize,
                letterSpacing: '-0.5px',
                color: isOvertime ? '#c0533a' : 'var(--text)',
                lineHeight: 1,
              }}>
                {displayTime}
              </span>
            </div>
          </div>

          {/* Status pill — hidden at very small sizes */}
          {arcSize >= 90 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                backgroundColor:
                  isOvertime ? '#c0533a' :
                  isActive   ? timer.color :
                  timer.status === 'paused' ? 'var(--text-muted)' : 'var(--border)',
                boxShadow: isActive && !isOvertime ? `0 0 5px ${timer.color}88` : 'none',
                transition: 'background-color 0.3s, box-shadow 0.3s',
              }} />
              <span style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isOvertime ? '#c0533a' : isActive ? timer.color : 'var(--text-hint)',
              }}>
                {statusLabel}
              </span>
            </div>
          )}
        </div>

        {/* Controls — always pinned at bottom */}
        <div style={{ display: 'flex', gap: 8, width: '100%', flexShrink: 0, marginTop: 12 }}>
          <button
            onClick={isActive ? onPause : onStart}
            style={{
              flex: 1, backgroundColor: timer.color, border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 600, fontSize: 15, padding: '8px 0', cursor: 'pointer',
            }}
          >
            {isActive ? '⏸' : '▶'}
          </button>
          <button
            onClick={onReset}
            title="Reset"
            style={{
              backgroundColor: 'transparent', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-muted)', fontSize: 16,
              padding: '8px 13px', cursor: 'pointer',
            }}
          >↺</button>
        </div>
      </div>
      </>
      )}

      {/* ── Resize handle (bottom-right corner) ── */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Resize"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 24,
          height: 24,
          cursor: 'se-resize',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: 5,
          color: 'var(--text-hint)',
          opacity: 0.45,
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
