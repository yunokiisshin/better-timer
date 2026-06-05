import Papa from 'papaparse';
import type { TimerState, SessionState, LinearSessionState } from '../types';

export interface ParsedRow {
  name: string;
  duration: number;
  color?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export interface ParsedChildRow {
  name: string;
  duration: number;
  color?: string;
}

export interface ParsedSessionRow {
  name: string;
  totalDuration: number;
  color?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  children: ParsedChildRow[];
}

export interface ParsedLinearTaskRow {
  name: string;
  duration: number;
}

export interface ParsedLinearSessionRow {
  name: string;
  color?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  tasks: ParsedLinearTaskRow[];
}

export interface ParsedResult {
  timers: ParsedRow[];
  sessions: ParsedSessionRow[];
  linearSessions: ParsedLinearSessionRow[];
}

function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function downloadCSV(timers: TimerState[], sessions: SessionState[], linearSessions: LinearSessionState[] = []) {
  const rows: Record<string, string | number>[] = [];

  for (const t of timers) {
    rows.push({
      type:     'timer',
      name:     t.name,
      duration: fmtDuration(t.duration),
      color:    t.color,
      x:        Math.round(t.position.x),
      y:        Math.round(t.position.y),
      w:        t.size.w,
      h:        t.size.h,
    });
  }

  for (const s of sessions) {
    rows.push({
      type:     'session',
      name:     s.name,
      duration: fmtDuration(s.totalDuration),
      color:    s.color,
      x:        Math.round(s.position.x),
      y:        Math.round(s.position.y),
      w:        s.size.w,
      h:        s.size.h,
    });
    for (const c of s.children) {
      rows.push({
        type:     'child',
        name:     c.name,
        duration: fmtDuration(c.duration),
        color:    c.color,
        x:        '',
        y:        '',
        w:        '',
        h:        '',
      });
    }
  }

  for (const s of linearSessions) {
    rows.push({
      type:     'linear-session',
      name:     s.name,
      duration: '',
      color:    s.color,
      x:        Math.round(s.position.x),
      y:        Math.round(s.position.y),
      w:        s.size.w,
      h:        s.size.h,
    });
    for (const t of s.tasks) {
      rows.push({
        type:     'task',
        name:     t.name,
        duration: fmtDuration(t.duration),
        color:    '',
        x:        '',
        y:        '',
        w:        '',
        h:        '',
      });
    }
  }

  const csv  = Papa.unparse(rows, { columns: ['type', 'name', 'duration', 'color', 'x', 'y', 'w', 'h'] });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `timer-setup-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseCSV(text: string): ParsedResult {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });

  const hasTypeCol = data.length > 0 && 'type' in (data[0] ?? {});

  const timers: ParsedRow[] = [];
  const sessions: ParsedSessionRow[] = [];
  const linearSessions: ParsedLinearSessionRow[] = [];
  let currentSession: ParsedSessionRow | null = null;
  let currentLinearSession: ParsedLinearSessionRow | null = null;

  for (const r of data) {
    const rowType = hasTypeCol ? (r['type'] ?? '').trim().toLowerCase() : 'timer';

    if (rowType === 'session') {
      currentLinearSession = null;
      currentSession = {
        name:          (r['name'] ?? '').trim() || 'Nested Timer',
        totalDuration: parseSecs(r['duration'] ?? ''),
        children:      [],
      };
      const rawColor = (r['color'] ?? '').trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(rawColor)) currentSession.color = rawColor;
      const rawX = parseFloat(r['x'] ?? '');
      const rawY = parseFloat(r['y'] ?? '');
      if (isFinite(rawX) && rawX >= 0) currentSession.x = rawX;
      if (isFinite(rawY) && rawY >= 0) currentSession.y = rawY;
      const rawW = parseFloat(r['w'] ?? '');
      const rawH = parseFloat(r['h'] ?? '');
      if (isFinite(rawW) && rawW > 0) currentSession.w = rawW;
      if (isFinite(rawH) && rawH > 0) currentSession.h = rawH;
      sessions.push(currentSession);

    } else if (rowType === 'child' && currentSession) {
      const child: ParsedChildRow = {
        name:     (r['name'] ?? '').trim() || 'Segment',
        duration: parseSecs(r['duration'] ?? ''),
      };
      const rawColor = (r['color'] ?? '').trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(rawColor)) child.color = rawColor;
      currentSession.children.push(child);

    } else if (rowType === 'linear-session') {
      currentSession = null;
      currentLinearSession = {
        name:  (r['name'] ?? '').trim() || 'Session',
        tasks: [],
      };
      const rawColor = (r['color'] ?? '').trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(rawColor)) currentLinearSession.color = rawColor;
      const rawX = parseFloat(r['x'] ?? '');
      const rawY = parseFloat(r['y'] ?? '');
      if (isFinite(rawX) && rawX >= 0) currentLinearSession.x = rawX;
      if (isFinite(rawY) && rawY >= 0) currentLinearSession.y = rawY;
      const rawW = parseFloat(r['w'] ?? '');
      const rawH = parseFloat(r['h'] ?? '');
      if (isFinite(rawW) && rawW > 0) currentLinearSession.w = rawW;
      if (isFinite(rawH) && rawH > 0) currentLinearSession.h = rawH;
      linearSessions.push(currentLinearSession);

    } else if (rowType === 'task' && currentLinearSession) {
      currentLinearSession.tasks.push({
        name:     (r['name'] ?? '').trim() || 'Task',
        duration: parseSecs(r['duration'] ?? ''),
      });

    } else {
      // 'timer' or legacy rows without a type column
      currentSession = null;
      currentLinearSession = null;
      const row: ParsedRow = {
        name:     (r['name'] ?? '').trim() || 'Timer',
        duration: parseSecs(r['duration'] ?? ''),
      };
      const rawColor = (r['color'] ?? '').trim();
      if (/^#[0-9a-fA-F]{3,6}$/.test(rawColor)) row.color = rawColor;
      const rawX = parseFloat(r['x'] ?? '');
      const rawY = parseFloat(r['y'] ?? '');
      if (isFinite(rawX) && rawX >= 0) row.x = rawX;
      if (isFinite(rawY) && rawY >= 0) row.y = rawY;
      const rawW = parseFloat(r['w'] ?? '');
      const rawH = parseFloat(r['h'] ?? '');
      if (isFinite(rawW) && rawW > 0) row.w = rawW;
      if (isFinite(rawH) && rawH > 0) row.h = rawH;
      timers.push(row);
    }
  }

  return { timers, sessions, linearSessions };
}

function parseSecs(val: string): number {
  const v = val.trim();
  if (!v) return 300;
  if (v.includes(':')) {
    const p = v.split(':').map(Number);
    if (p.length === 2) return (p[0] ?? 0) * 60  + (p[1] ?? 0);
    if (p.length === 3) return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0);
  }
  const n = parseInt(v, 10);
  return isNaN(n) || n <= 0 ? 300 : n;
}
