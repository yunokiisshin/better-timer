import { useState, useEffect, useCallback, useRef } from 'react';
import type { LinearSessionState, SessionTask } from '../types';
import { DEFAULT_LINEAR_SESSION_SIZE } from '../types';

const STORAGE_KEY = 'better-timer-linear-sessions-v1';

function load(): LinearSessionState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as LinearSessionState[]).map(s => ({
      ...s,
      size:             s.size ?? { ...DEFAULT_LINEAR_SESSION_SIZE },
      activeTaskIdx:    s.activeTaskIdx ?? 0,
      taskStartElapsed: s.taskStartElapsed ?? [0],
      status: (s.status === 'running' || s.status === 'overtime') ? 'paused' : s.status,
    }));
  } catch {
    return [];
  }
}

export function useLinearSessions() {
  const [sessions, setSessions] = useState<LinearSessionState[]>(load);
  const countRef = useRef(0);
  countRef.current = sessions.length;

  useEffect(() => {
    const id = setInterval(() => {
      setSessions(prev => {
        if (!prev.some(s => s.status === 'running' || s.status === 'overtime')) return prev;
        return prev.map(s => {
          if (s.status !== 'running' && s.status !== 'overtime') return s;
          const totalDuration = s.tasks.reduce((sum, t) => sum + t.duration, 0);
          const e = s.elapsed + 1;
          const newStatus: LinearSessionState['status'] =
            totalDuration > 0 && e >= totalDuration ? 'overtime' : 'running';
          return { ...s, elapsed: e, status: newStatus };
        });
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const start = useCallback((id: string) =>
    setSessions(p => p.map(s => {
      if (s.id !== id) return s;
      const totalDuration = s.tasks.reduce((sum, t) => sum + t.duration, 0);
      return { ...s, status: totalDuration > 0 && s.elapsed >= totalDuration ? 'overtime' : 'running' };
    })), []);

  const pause = useCallback((id: string) =>
    setSessions(p => p.map(s => s.id === id ? { ...s, status: 'paused' } : s)), []);

  const reset = useCallback((id: string) =>
    setSessions(p => p.map(s =>
      s.id === id ? { ...s, elapsed: 0, status: 'idle', activeTaskIdx: 0, taskStartElapsed: [0] } : s
    )), []);

  const remove = useCallback((id: string) =>
    setSessions(p => p.filter(s => s.id !== id)), []);

  const add = useCallback((cfg: { name: string; color: string }, position?: { x: number; y: number }) => {
    const n = countRef.current;
    setSessions(p => [...p, {
      ...cfg,
      id: crypto.randomUUID(),
      tasks: [],
      elapsed: 0,
      activeTaskIdx: 0,
      taskStartElapsed: [0],
      status: 'idle' as LinearSessionState['status'],
      position: position ?? {
        x: 24 + (n % 2) * (DEFAULT_LINEAR_SESSION_SIZE.w + 24),
        y: 24 + Math.floor(n / 2) * (DEFAULT_LINEAR_SESSION_SIZE.h + 24),
      },
      size: { ...DEFAULT_LINEAR_SESSION_SIZE },
    }]);
  }, []);

  const addTask = useCallback((sessionId: string, cfg: { name: string; duration: number }) =>
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const task: SessionTask = { id: crypto.randomUUID(), ...cfg };
      return { ...s, tasks: [...s.tasks, task] };
    })), []);

  const removeTask = useCallback((sessionId: string, taskId: string) =>
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, tasks: s.tasks.filter(t => t.id !== taskId) };
    })), []);

  const updateTask = useCallback((sessionId: string, taskId: string, cfg: { name: string; duration: number }) =>
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, tasks: s.tasks.map(t => t.id === taskId ? { ...t, ...cfg } : t) };
    })), []);

  const reorderTask = useCallback((sessionId: string, taskId: string, targetId: string) =>
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const from = s.tasks.findIndex(t => t.id === taskId);
      const to   = s.tasks.findIndex(t => t.id === targetId);
      if (from === -1 || to === -1 || from === to) return s;
      const next = [...s.tasks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return { ...s, tasks: next };
    })), []);

  // Advance to the next task without snapping elapsed — elapsed keeps running
  const skipTask = useCallback((id: string) =>
    setSessions(p => p.map(s => {
      if (s.id !== id) return s;
      if (s.activeTaskIdx >= s.tasks.length) return s; // all tasks done
      const nextIdx = s.activeTaskIdx + 1;
      const newTaskStartElapsed = [...s.taskStartElapsed];
      newTaskStartElapsed[nextIdx] = s.elapsed;
      return { ...s, activeTaskIdx: nextIdx, taskStartElapsed: newTaskStartElapsed };
    })), []);

  const updatePosition = useCallback((id: string, pos: { x: number; y: number }) =>
    setSessions(p => p.map(s => s.id === id ? { ...s, position: pos } : s)), []);

  const updateSize = useCallback((id: string, size: { w: number; h: number }) =>
    setSessions(p => p.map(s => s.id === id ? { ...s, size } : s)), []);

  const clearAll = useCallback(() => setSessions([]), []);
  const setAll = useCallback((next: LinearSessionState[]) => setSessions(next), []);

  return {
    sessions,
    start, pause, reset, remove, add,
    addTask, removeTask, updateTask, reorderTask, skipTask,
    updatePosition, updateSize,
    clearAll, setAll,
  };
}
