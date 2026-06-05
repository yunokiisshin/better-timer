import { useRef, useState } from 'react';
import type { TimerState, SessionState, LinearSessionState } from '../types';
import { downloadCSV, parseCSV, type ParsedResult } from '../utils/csv';

interface Props {
  timers: TimerState[];
  sessions: SessionState[];
  linearSessions: LinearSessionState[];
  width: number;
  onAddTimer: () => void;
  onAddSession: () => void;
  onAddLinearSession: () => void;
  onLoadData: (result: ParsedResult) => void;
  onClearAll: () => void;
}

function SideBtn({
  onClick,
  disabled,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'default' | 'ghost' | 'danger';
}) {
  const [hovered, setHovered] = useState(false);
  const isHot = hovered && !disabled;

  const styles: React.CSSProperties = {
    width: '100%',
    padding: '9px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    opacity: disabled ? 0.4 : 1,
    transition: 'opacity 0.15s, background-color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    ...(variant === 'primary'  ? { backgroundColor: isHot ? 'var(--text-muted)' : 'var(--text)', border: 'none', color: 'var(--surface-raised)' } :
        variant === 'ghost'    ? { backgroundColor: isHot ? 'var(--border-light)' : 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' } :
        variant === 'danger'   ? { backgroundColor: isHot ? '#b8504012' : 'transparent', border: '1px solid var(--border)', color: '#b85040' } :
                                  { backgroundColor: isHot ? 'var(--border)' : 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }),
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={styles}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p style={{
      margin: '0 0 8px',
      color: 'var(--text-hint)',
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      fontWeight: 600,
    }}>
      {label}
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {children}
    </div>
  </div>
);

const Divider = () => (
  <div style={{ height: 1, backgroundColor: 'var(--border-light)', margin: '4px 0' }} />
);

export function Sidebar({ timers, sessions, linearSessions, width, onAddTimer, onAddSession, onAddLinearSession, onLoadData, onClearAll }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const result = parseCSV(text);
      if (result.timers.length > 0 || result.sessions.length > 0 || result.linearSessions.length > 0) onLoadData(result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const running  = timers.filter(t => t.status === 'running').length;
  const overtime = timers.filter(t => t.status === 'overtime').length;

  return (
    <div style={{
      width,
      flexShrink: 0,
      backgroundColor: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '22px 14px 18px',
      gap: 18,
      overflowY: 'auto',
    }}>
      {/* Brand */}
      <div>
        <div style={{
          color: 'var(--text)',
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '-0.4px',
          lineHeight: 1,
        }}>
          Better Timer
        </div>
        <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-hint)', lineHeight: 1.4 }}>
          {timers.length === 0 ? 'No timers' : `${timers.length} timer${timers.length !== 1 ? 's' : ''}`}
          {(running + overtime) > 0 && (
            <span style={{ color: overtime > 0 ? '#c0533a' : 'var(--text-muted)' }}>
              {' · '}{running + overtime} active
            </span>
          )}
        </div>
      </div>

      <Divider />

      <Section label="Timers">
        <SideBtn onClick={onAddTimer}>＋  Add timer</SideBtn>
      </Section>

      <Divider />

      <Section label="Sessions">
        <SideBtn onClick={onAddLinearSession}>＋  New session</SideBtn>
      </Section>

      <Divider />

      <Section label="Nested Timers">
        <SideBtn onClick={onAddSession}>＋  New nested timer</SideBtn>
      </Section>

      <Divider />

      <Section label="Data">
        <SideBtn onClick={() => downloadCSV(timers, sessions, linearSessions)} disabled={timers.length === 0 && sessions.length === 0 && linearSessions.length === 0}>
          ↓  Download CSV
        </SideBtn>
        <SideBtn onClick={() => fileRef.current?.click()}>
          ↑  Upload CSV
        </SideBtn>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
      </Section>

      {/* CSV hint */}
      <div style={{
        backgroundColor: 'var(--surface-raised)',
        borderRadius: 10,
        border: '1px solid var(--border-light)',
        padding: '10px 12px',
      }}>
        <p style={{
          margin: '0 0 6px',
          color: 'var(--text-hint)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
        }}>
          CSV format
        </p>
        <code style={{
          fontSize: 10,
          color: 'var(--text-hint)',
          lineHeight: 1.9,
          display: 'block',
          fontFamily: 'ui-monospace, monospace',
        }}>
          name, duration<br />
          name, duration, color<br />
          name, duration, color, x, y
        </code>
        <p style={{
          margin: '8px 0 0',
          color: 'var(--text-hint)',
          fontSize: 10,
          lineHeight: 1.5,
        }}>
          color and x, y are optional. Download preserves your full layout.
        </p>
      </div>

      <div style={{ flex: 1 }} />

      <Divider />

      {confirmClear ? (
        <div style={{
          backgroundColor: 'var(--surface-raised)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This will clear your whole palette — nothing can be undone! Consider downloading your setup first so you can reload it later. 💾
          </p>
          <div style={{ display: 'flex', gap: 7 }}>
            <SideBtn onClick={() => setConfirmClear(false)}>
              Keep it
            </SideBtn>
            <SideBtn
              onClick={() => { onClearAll(); setConfirmClear(false); }}
              variant="danger"
            >
              Clear
            </SideBtn>
          </div>
        </div>
      ) : (
        <SideBtn
          onClick={() => setConfirmClear(true)}
          disabled={timers.length === 0 && sessions.length === 0 && linearSessions.length === 0}
          variant="danger"
        >
          ✕  Clear palette
        </SideBtn>
      )}
    </div>
  );
}
