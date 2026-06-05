import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerState } from '../types';
import { DEFAULT_SIZE } from '../types';

const STORAGE_KEY = 'better-timer-v1';

function load(): TimerState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as TimerState[]).map(t => ({
      ...t,
      size: t.size ?? { ...DEFAULT_SIZE },
      status: t.status === 'running' || t.status === 'overtime' ? 'paused' : t.status,
    }));
  } catch {
    return [];
  }
}

export function useTimers() {
  const [timers, setTimers] = useState<TimerState[]>(load);
  const countRef = useRef(0);
  countRef.current = timers.length;

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => {
      setTimers(prev => {
        if (!prev.some(t => t.status === 'running' || t.status === 'overtime')) return prev;
        return prev.map(t => {
          if (t.status !== 'running' && t.status !== 'overtime') return t;
          const e = t.elapsed + 1;
          return { ...t, elapsed: e, status: e >= t.duration ? 'overtime' : 'running' };
        });
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
  }, [timers]);

  const start = useCallback((id: string) =>
    setTimers(p => p.map(t =>
      t.id === id ? { ...t, status: t.elapsed >= t.duration ? 'overtime' : 'running' } : t
    )), []);

  const pause = useCallback((id: string) =>
    setTimers(p => p.map(t =>
      t.id === id ? { ...t, status: 'paused' } : t
    )), []);

  const reset = useCallback((id: string) =>
    setTimers(p => p.map(t =>
      t.id === id ? { ...t, elapsed: 0, status: 'idle' } : t
    )), []);

  const remove = useCallback((id: string) =>
    setTimers(p => p.filter(t => t.id !== id)), []);

  const add = useCallback((cfg: { name: string; duration: number; color: string }, position?: { x: number; y: number }) => {
    const n = countRef.current;
    const col = n % 3;
    const row = Math.floor(n / 3);
    setTimers(p => [...p, {
      ...cfg,
      id: crypto.randomUUID(),
      position: position ?? { x: 24 + col * (DEFAULT_SIZE.w + 24), y: 24 + row * (DEFAULT_SIZE.h + 24) },
      size: { ...DEFAULT_SIZE },
      elapsed: 0,
      status: 'idle',
    }]);
  }, []);

  const updatePosition = useCallback((id: string, pos: { x: number; y: number }) =>
    setTimers(p => p.map(t => t.id === id ? { ...t, position: pos } : t)), []);

  const updateSize = useCallback((id: string, size: { w: number; h: number }) =>
    setTimers(p => p.map(t => t.id === id ? { ...t, size } : t)), []);

  const update = useCallback((id: string, cfg: { name: string; duration: number; color: string }) =>
    setTimers(p => p.map(t => t.id === id ? { ...t, ...cfg } : t)), []);

  // Move timer at `id` to the position currently occupied by `targetId`
  const reorder = useCallback((id: string, targetId: string) =>
    setTimers(prev => {
      const from = prev.findIndex(t => t.id === id);
      const to   = prev.findIndex(t => t.id === targetId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    }), []);

  const setAll = useCallback((next: TimerState[]) => setTimers(next), []);

  return { timers, start, pause, reset, remove, add, update, updatePosition, updateSize, reorder, setAll };
}
