import { useEffect, useRef, useState } from 'react';
import type { SessionState } from '../types';
import { CircularProgress } from './CircularProgress';
import { PRESET_COLORS } from '../constants';

const MIN_W = 224, MAX_W = 560;
const MIN_H = 320, MAX_H = 720;

function fmt(secs: number): string {
  const s = Math.floor(Math.abs(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface Props {
  session: SessionState;
  onStartChild: (childId: string) => void;
  onPauseChild: (childId: string) => void;
  onResetChild: (childId: string) => void;
  onResetSession: () => void;
  onDelete: () => void;
  onAddChild: (cfg: { name: string; duration: number; color: string }) => void;
  onUpdateChild: (childId: string, cfg: { name: string; duration: number; color: string }) => void;
  onRemoveChild: (childId: string) => void;
  onReorderChild: (childId: string, targetChildId: string) => void;
  onUpdatePosition: (pos: { x: number; y: number }) => void;
  onUpdateSize: (size: { w: number; h: number }) => void;
}

export function SessionCard({
  session, onStartChild, onPauseChild, onResetChild, onResetSession,
  onDelete, onAddChild, onUpdateChild, onRemoveChild, onReorderChild, onUpdatePosition, onUpdateSize,
}: Props) {
  const drag   = useRef({ active: false, startX: 0, startY: 0, startPX: 0, startPY: 0 });
  const resize = useRef({ active: false, startX: 0, startY: 0, startW: 0, startH: 0 });
  const posRef  = useRef(onUpdatePosition);  posRef.current  = onUpdatePosition;
  const sizeRef = useRef(onUpdateSize);      sizeRef.current = onUpdateSize;

  // Child drag-to-reorder state
  const [draggingChildId, setDraggingChildId] = useState<string | null>(null);
  const childActive        = useRef(false);
  const childItemRefs      = useRef<Map<string, HTMLDivElement>>(new Map());
  const draggingChildIdRef = useRef<string | null>(null);
  draggingChildIdRef.current = draggingChildId;
  const reorderChildRef = useRef(onReorderChild);
  reorderChildRef.current = onReorderChild;

  const [showAddForm, setShowAddForm]     = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editName, setEditName]           = useState('');
  const [editH, setEditH]                 = useState('0');
  const [editM, setEditM]                 = useState('5');
  const [editS, setEditS]                 = useState('0');
  const [editColor, setEditColor]         = useState<string>(PRESET_COLORS[0]!);

  const startEditChild = (childId: string) => {
    const child = session.children.find(c => c.id === childId);
    if (!child) return;
    setEditName(child.name);
    setEditH(String(Math.floor(child.duration / 3600)));
    setEditM(String(Math.floor((child.duration % 3600) / 60)));
    setEditS(String(child.duration % 60));
    setEditColor(child.color);
    setEditingChildId(childId);
  };

  const handleSaveChild = () => {
    if (!editingChildId) return;
    const duration = (parseInt(editH) || 0) * 3600 + (parseInt(editM) || 0) * 60 + (parseInt(editS) || 0);
    if (!editName.trim() || duration <= 0) return;
    onUpdateChild(editingChildId, { name: editName.trim(), duration, color: editColor });
    setEditingChildId(null);
  };
  const [newName, setNewName] = useState('');
  const [newH, setNewH] = useState('0');
  const [newM, setNewM] = useState('5');
  const [newS, setNewS] = useState('0');
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0]!);

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

  // Child reorder via vertical drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!childActive.current || !draggingChildIdRef.current) return;
      let closestId: string | null = null;
      let closestDist = Infinity;
      childItemRefs.current.forEach((el, id) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - center);
        if (dist < closestDist) { closestDist = dist; closestId = id; }
      });
      if (closestId && closestId !== draggingChildIdRef.current) {
        reorderChildRef.current(draggingChildIdRef.current, closestId);
      }
    };
    const onUp = () => { childActive.current = false; setDraggingChildId(null); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleAddChild = () => {
    const duration = (parseInt(newH) || 0) * 3600 + (parseInt(newM) || 0) * 60 + (parseInt(newS) || 0);
    if (!newName.trim() || duration <= 0) return;
    onAddChild({ name: newName.trim(), duration, color: newColor });
    setNewName(''); setNewH('0'); setNewM('5'); setNewS('0');
    setNewColor(PRESET_COLORS[0]!);
    setShowAddForm(false);
  };

  const totalElapsed = session.children.reduce((sum, c) => sum + c.elapsed, 0);
  const progress = session.totalDuration > 0 ? Math.min(totalElapsed / session.totalDuration, 1) : 0;
  const isOvertime = totalElapsed > session.totalDuration && session.totalDuration > 0;
  const isActive = session.status === 'running' || session.status === 'overtime';

  // Debt from segments that have been started: how much total overtime they've accumulated
  const debt = session.children
    .filter(c => c.elapsed > 0)
    .reduce((sum, c) => sum + (c.elapsed - c.duration), 0);

  const { w, h } = session.size;
  const arcSize = Math.max(80, Math.min(w - 80, 130));
  const displayTime = isOvertime
    ? `+${fmt(totalElapsed - session.totalDuration)}`
    : fmt(session.totalDuration - totalElapsed);

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
        boxShadow: isActive
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
          Nested Timer
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

      {/* Overview: arc + stats */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 14px 10px',
        gap: 12,
        flexShrink: 0,
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{ position: 'relative', width: arcSize, height: arcSize, flexShrink: 0 }}>
          <CircularProgress progress={progress} isOvertime={isOvertime} color={session.color} size={arcSize} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontVariantNumeric: 'tabular-nums', fontWeight: 700,
              fontSize: Math.max(10, Math.round(arcSize * 0.145)),
              color: isOvertime ? '#c0533a' : 'var(--text)',
              letterSpacing: '-0.5px', lineHeight: 1,
            }}>
              {displayTime}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Budget: <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(session.totalDuration)}</strong>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-hint)' }}>
            {session.children.length === 0
              ? 'No segments'
              : `${session.children.length} segment${session.children.length !== 1 ? 's' : ''}`}
          </div>

          {/* Debt / schedule indicator */}
          {debt > 2 && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: '#c0533a',
              backgroundColor: '#c0533a1a', borderRadius: 6, padding: '2px 7px',
              display: 'inline-block', width: 'fit-content',
            }}>
              {fmt(debt)} behind
            </span>
          )}
          {debt < -2 && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: '#4a8a85',
              backgroundColor: '#4a8a851a', borderRadius: 6, padding: '2px 7px',
              display: 'inline-block', width: 'fit-content',
            }}>
              {fmt(Math.abs(debt))} ahead
            </span>
          )}
          {Math.abs(debt) <= 2 && totalElapsed > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-hint)', fontStyle: 'italic' }}>
              On schedule
            </span>
          )}

          <button
            onClick={onResetSession}
            onMouseDown={e => e.stopPropagation()}
            style={{
              marginTop: 2,
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: 'var(--text-muted)', fontSize: 10, padding: '3px 8px',
              cursor: 'pointer', width: 'fit-content',
            }}
          >
            Reset all
          </button>
        </div>
      </div>

      {/* Segment list */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '6px 8px',
        display: 'flex', flexDirection: 'column', gap: 3,
        minHeight: 0,
      }}>
        {session.children.length === 0 && !showAddForm && (
          <p style={{
            margin: 0, padding: '14px 0', textAlign: 'center',
            color: 'var(--text-hint)', fontSize: 12, fontStyle: 'italic',
          }}>
            No segments yet — add one below
          </p>
        )}

        {session.children.map((child, idx) => {
          const isRunning   = child.status === 'running' || child.status === 'overtime';
          const isDragging  = child.id === draggingChildId;
          const pct         = child.duration > 0 ? Math.min(child.elapsed / child.duration * 100, 100) : 0;
          const childDisplay = child.status === 'overtime'
            ? `+${fmt(child.elapsed - child.duration)}`
            : child.elapsed > 0
              ? fmt(child.duration - child.elapsed)
              : fmt(child.duration);

          const isEditing = child.id === editingChildId;

          return (
            <div
              key={child.id}
              ref={el => { if (el) childItemRefs.current.set(child.id, el); else childItemRefs.current.delete(child.id); }}
              style={{
                borderRadius: 12,
                backgroundColor: isEditing ? 'var(--surface)' : isDragging ? 'var(--surface)' : isRunning ? `${child.color}14` : 'transparent',
                border: isEditing ? '1px solid var(--border)' : isRunning && !isDragging ? `1px solid ${child.color}35` : '1px solid transparent',
                opacity: isDragging ? 0.55 : 1,
                transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                transition: 'background-color 0.25s, border-color 0.25s, opacity 0.15s, transform 0.15s',
                overflow: 'hidden',
              }}
            >
            {/* ── Edit form ── */}
            {isEditing ? (
              <div style={{ padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveChild(); if (e.key === 'Escape') setEditingChildId(null); }}
                  placeholder="Segment name"
                  style={{
                    border: '1px solid var(--border)', borderRadius: 7,
                    padding: '6px 9px', fontSize: 13,
                    backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
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
                          width: 36, border: '1px solid var(--border)', borderRadius: 6,
                          padding: '4px 0', fontSize: 12, textAlign: 'center',
                          backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      onMouseDown={e => e.stopPropagation()}
                      style={{
                        width: 18, height: 18, borderRadius: '50%', backgroundColor: c,
                        border: editColor === c ? '2px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setEditingChildId(null)}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      backgroundColor: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 7, color: 'var(--text-muted)', fontSize: 12,
                      padding: '6px 12px', cursor: 'pointer',
                    }}
                  >Cancel</button>
                  <button
                    onClick={handleSaveChild}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      flex: 1, backgroundColor: editColor,
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
                padding: '10px 10px',
                cursor: isDragging ? 'grabbing' : 'auto',
              }}>
              {/* Drag grip */}
              <span
                onMouseDown={e => {
                  e.stopPropagation();
                  childActive.current = true;
                  setDraggingChildId(child.id);
                  e.preventDefault();
                }}
                style={{
                  color: 'var(--text-hint)', fontSize: 11, letterSpacing: 0.5,
                  cursor: isDragging ? 'grabbing' : 'grab', flexShrink: 0, userSelect: 'none',
                }}
              >
                ⠿
              </span>

              {/* Number badge */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                backgroundColor: child.status === 'idle' ? 'var(--border)' : child.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: 9, color: '#fff', fontWeight: 700,
                transition: 'background-color 0.25s',
              }}>
                {idx + 1}
              </div>

              {/* Name + progress bar */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span style={{
                    fontSize: 13, fontWeight: isRunning ? 600 : 400,
                    color: child.status === 'idle' ? 'var(--text-hint)' : isRunning ? 'var(--text)' : 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                    transition: 'color 0.2s',
                  }}>
                    {child.name}
                  </span>
                  <span style={{
                    fontSize: 12, fontVariantNumeric: 'tabular-nums', marginLeft: 8, flexShrink: 0,
                    color: child.status === 'overtime' ? '#c0533a' : isRunning ? child.color : 'var(--text-hint)',
                  }}>
                    {childDisplay}
                  </span>
                </div>
                <div style={{ height: 4, backgroundColor: 'var(--border-light)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    backgroundColor: child.status === 'overtime' ? '#c0533a' : child.color,
                    borderRadius: 99, transition: 'width 0.9s linear, background-color 0.35s',
                    opacity: child.status === 'idle' ? 0 : 1,
                  }} />
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => isRunning ? onPauseChild(child.id) : onStartChild(child.id)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: 30, height: 30,
                    backgroundColor: isRunning ? child.color : 'var(--surface)',
                    border: `1px solid ${isRunning ? child.color : 'var(--border)'}`,
                    borderRadius: 8, color: isRunning ? '#fff' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background-color 0.2s, border-color 0.2s',
                  }}
                >
                  {isRunning ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => onResetChild(child.id)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: 30, height: 30,
                    backgroundColor: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-hint)', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >↺</button>
                <button
                  onClick={() => startEditChild(child.id)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: 30, height: 30,
                    backgroundColor: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 8, color: 'var(--text-hint)', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✏</button>
                <button
                  onClick={() => onRemoveChild(child.id)}
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

        {/* Inline add form */}
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
              onKeyDown={e => { if (e.key === 'Enter') handleAddChild(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder="Segment name"
              style={{
                border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 9px', fontSize: 12,
                backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              {([
                { val: newH, set: setNewH, label: 'h' },
                { val: newM, set: setNewM, label: 'm' },
                { val: newS, set: setNewS, label: 's' },
              ] as const).map(({ val, set, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
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
                  <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  onMouseDown={e => e.stopPropagation()}
                  style={{
                    width: 18, height: 18, borderRadius: '50%',
                    backgroundColor: c,
                    border: newColor === c ? '2px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleAddChild}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  flex: 1, backgroundColor: newColor,
                  border: 'none', borderRadius: 7,
                  color: '#fff', fontWeight: 600, fontSize: 12,
                  padding: '6px 0', cursor: 'pointer',
                }}
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  backgroundColor: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 7, color: 'var(--text-muted)', fontSize: 12,
                  padding: '6px 12px', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add segment button */}
      {!showAddForm && (
        <div style={{ padding: '5px 8px 8px', flexShrink: 0 }}>
          <button
            onClick={() => setShowAddForm(true)}
            onMouseDown={e => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              border: '1px dashed var(--border)',
              borderRadius: 8, color: 'var(--text-hint)',
              fontSize: 11, padding: '7px 0', cursor: 'pointer',
            }}
          >
            + Add segment
          </button>
        </div>
      )}

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
