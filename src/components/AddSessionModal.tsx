import { useState } from 'react';
import { PRESET_COLORS } from '../constants';

interface Props {
  onAdd: (cfg: { name: string; totalDuration: number; color: string }) => void;
  onClose: () => void;
}

export function AddSessionModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('30');
  const [seconds, setSeconds] = useState('0');
  const [color, setColor] = useState<string>(PRESET_COLORS[0]!);

  const totalDuration = (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
  const canAdd = name.trim().length > 0 && totalDuration > 0;

  const handleSubmit = () => {
    if (!canAdd) return;
    onAdd({ name: name.trim(), totalDuration, color });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(3px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: 'var(--surface-raised)', borderRadius: 18, padding: 28,
        width: 340, border: '1px solid var(--border)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            New Nested Timer
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-hint)', lineHeight: 1.5 }}>
            A nested timer groups manually-controlled segments within an overall time budget. Add segments from inside the card.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Nested timer name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
            placeholder="e.g. Morning Lecture"
            style={{
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '9px 12px', fontSize: 14,
              backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Total duration</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {([
              { val: hours,   set: setHours,   label: 'h' },
              { val: minutes, set: setMinutes, label: 'm' },
              { val: seconds, set: setSeconds, label: 's' },
            ] as const).map(({ val, set, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  value={val}
                  onChange={e => set(e.target.value)}
                  style={{
                    width: 52, border: '1px solid var(--border)', borderRadius: 8,
                    padding: '8px 0', fontSize: 16, textAlign: 'center',
                    backgroundColor: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-hint)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? '2.5px solid var(--text)' : '2.5px solid transparent',
                  outline: color === c ? '1.5px solid var(--surface-raised)' : 'none',
                  outlineOffset: -2,
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'transparent' }}
            />
          </div>
        </div>

        <div style={{ height: 5, borderRadius: 99, backgroundColor: color }} />

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-muted)', fontSize: 14,
              padding: '10px 18px', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canAdd}
            style={{
              flex: 1, backgroundColor: canAdd ? color : 'var(--border)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontWeight: 600, fontSize: 14,
              padding: '10px 0', cursor: canAdd ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
          >
            Create Nested Timer
          </button>
        </div>
      </div>
    </div>
  );
}
