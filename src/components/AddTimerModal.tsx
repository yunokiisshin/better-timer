import { useState } from 'react';
import { PRESET_COLORS } from '../constants';

interface Props {
  onAdd: (cfg: { name: string; duration: number; color: string }) => void;
  onClose: () => void;
}

const inputBase: React.CSSProperties = {
  padding: '9px 11px',
  backgroundColor: 'var(--input-bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 14,
  fontVariantNumeric: 'tabular-nums',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    margin: '0 0 6px',
    color: 'var(--text-muted)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
  }}>
    {children}
  </p>
);

export function AddTimerModal({ onAdd, onClose }: Props) {
  const [name,    setName]    = useState('');
  const [hours,   setHours]   = useState('0');
  const [minutes, setMinutes] = useState('5');
  const [seconds, setSeconds] = useState('0');
  const [color,   setColor]   = useState<string>(PRESET_COLORS[0]!);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration =
      (parseInt(hours,   10) || 0) * 3600 +
      (parseInt(minutes, 10) || 0) * 60   +
      (parseInt(seconds, 10) || 0);
    if (duration <= 0) return;
    onAdd({ name: name.trim() || 'Timer', duration, color });
    onClose();
  };

  const numInput = (
    val: string,
    setter: (v: string) => void,
    max: number,
    label: string,
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
      <input
        type="number"
        min="0"
        max={max}
        value={val}
        onChange={e => setter(e.target.value)}
        style={{ ...inputBase, textAlign: 'center', width: '100%' }}
      />
      <span style={{ fontSize: 10, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(30, 22, 14, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: 'var(--surface-raised)',
          borderRadius: 20,
          padding: '28px 26px',
          width: 360,
          boxShadow: '0 24px 64px var(--shadow-md)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{
          margin: '0 0 22px',
          color: 'var(--text)',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '-0.2px',
        }}>
          New timer
        </h2>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <FieldLabel>Name</FieldLabel>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Group discussion"
            style={inputBase}
            autoFocus
          />
        </div>

        {/* Duration — hours, minutes, seconds */}
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Duration</FieldLabel>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {numInput(hours,   setHours,   23, 'hr')}
            <span style={{ color: 'var(--text-hint)', paddingTop: 10, fontSize: 18, fontWeight: 300 }}>:</span>
            {numInput(minutes, setMinutes, 59, 'min')}
            <span style={{ color: 'var(--text-hint)', paddingTop: 10, fontSize: 18, fontWeight: 300 }}>:</span>
            {numInput(seconds, setSeconds, 59, 'sec')}
          </div>
        </div>

        {/* Color */}
        <div style={{ marginBottom: 26 }}>
          <FieldLabel>Color</FieldLabel>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
            {PRESET_COLORS.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? '2.5px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  boxShadow: color === c ? `0 0 0 1.5px var(--surface-raised)` : 'none',
                  transition: 'transform 0.12s, border-color 0.12s',
                  transform: color === c ? 'scale(1.12)' : 'scale(1)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{
                width: 34,
                height: 34,
                border: '1px solid var(--border)',
                borderRadius: 8,
                cursor: 'pointer',
                padding: 2,
                backgroundColor: 'var(--input-bg)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-hint)', fontFamily: 'ui-monospace, monospace' }}>
              {color}
            </span>
          </div>
        </div>

        {/* Preview swatch */}
        <div style={{
          marginBottom: 22,
          height: 6,
          borderRadius: 99,
          backgroundColor: color,
          opacity: 0.8,
        }} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 0',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 11,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: '10px 0',
              backgroundColor: color,
              border: 'none',
              borderRadius: 11,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            Add timer
          </button>
        </div>
      </form>
    </div>
  );
}
